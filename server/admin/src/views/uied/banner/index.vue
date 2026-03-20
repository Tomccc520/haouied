<!--
 * @file views/uied/banner/index.vue
 * @description UIED 广告管理
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
-->
<template>
    <div class="banner-lists">
        <el-card class="!border-none" shadow="never">
            <el-alert
                title="广告管理用于配置站内广告展示；若该位置启用了商业位投放，系统会优先展示商业位内容，未投放时自动使用这里的广告配置。"
                type="info"
                :closable="false"
                class="mb-4"
            />
            <el-card shadow="never" class="mb-4 banner-ops-helper">
                <template #header>
                    <div class="flex items-center justify-between">
                        <span class="font-medium">广告位说明与快捷预览</span>
                        <div class="text-xs text-gray-400">按页面场景配置后，可直接新窗口预览效果</div>
                    </div>
                </template>
                <div class="banner-ops-helper__grid">
                    <div class="banner-ops-helper__card">
                        <div class="banner-ops-helper__title">常用展示场景</div>
                        <div class="banner-ops-helper__row">
                            <span class="banner-ops-helper__label">首页横幅</span>
                            <span>用于首页首屏广告展示，适合主活动与品牌曝光。</span>
                        </div>
                        <div class="banner-ops-helper__row">
                            <span class="banner-ops-helper__label">页面四宫格</span>
                            <span>展示在热门推荐上方，固定 4 张卡片，适合专题推荐。</span>
                        </div>
                        <div class="banner-ops-helper__row">
                            <span class="banner-ops-helper__label">侧栏广告</span>
                            <span>展示在页面右侧，适合长期曝光与辅助引导。</span>
                        </div>
                        <div class="banner-ops-helper__row">
                            <span class="banner-ops-helper__label">详情广告</span>
                            <span>展示在详情内容区域，适合与正文强相关的推广内容。</span>
                        </div>
                        <div class="banner-ops-helper__row">
                            <span class="banner-ops-helper__label">底部广告</span>
                            <span>展示在页面底部，适合补充推荐与活动收口。</span>
                        </div>
                    </div>
                    <div class="banner-ops-helper__card">
                        <div class="banner-ops-helper__title">快捷预览入口</div>
                        <div class="flex flex-wrap gap-2">
                            <el-button size="small" @click="openPreviewPage('/')"
                                >首页预览</el-button
                            >
                            <el-button size="small" @click="openPreviewPage('/p/hot?tab=daily-hot')"
                                >热榜预览</el-button
                            >
                            <el-button size="small" @click="openPreviewPage('/p/hot?tab=rankings')"
                                >榜单预览</el-button
                            >
                            <el-button size="small" @click="openPreviewPage('/website/1')"
                                >详情预览</el-button
                            >
                        </div>
                        <div class="banner-ops-helper__tip">
                            提示：建议在保存后分别检查“显示状态、时间范围、跳转链接”是否符合预期。
                        </div>
                    </div>
                </div>
            </el-card>
            <div class="mb-4 flex justify-between">
                <el-button type="primary" @click="handleAdd">
                    <template #icon><icon name="el-icon-Plus" /></template>
                    添加广告
                </el-button>
                <div class="text-gray-400">共 {{ pager.count }} 条广告</div>
            </div>
            <div class="mb-3 banner-scene-tabs">
                <el-tabs v-model="queryParams.scene" type="card" @tab-change="handleSceneTabChange">
                    <el-tab-pane
                        v-for="item in sceneFilterOptions"
                        :key="item.value"
                        :name="item.value"
                    >
                        <template #label>
                            <span>{{ item.label }}</span>
                        </template>
                    </el-tab-pane>
                </el-tabs>
            </div>
            <div class="mb-4 banner-filter-bar">
                <el-form :inline="true" class="banner-filter-form">
                    <el-form-item label="广告类型">
                        <el-select v-model="queryParams.contentType" style="width: 130px">
                            <el-option label="全部类型" value="all" />
                            <el-option label="图片广告" value="image" />
                            <el-option label="渐变文案" value="text" />
                            <el-option label="HTML广告" value="html" />
                        </el-select>
                    </el-form-item>
                    <el-form-item label="状态">
                        <el-select v-model="queryParams.status" style="width: 120px">
                            <el-option label="全部状态" value="all" />
                            <el-option label="显示中" value="active" />
                            <el-option label="已隐藏" value="hidden" />
                        </el-select>
                    </el-form-item>
                    <el-form-item label="关键词">
                        <el-input
                            v-model="queryParams.keyword"
                            clearable
                            style="width: 220px"
                            placeholder="标题/链接/页面标识"
                            @keyup.enter="handleQuery"
                        />
                    </el-form-item>
                </el-form>
                <div class="banner-filter-bar__actions">
                    <el-button type="primary" @click="handleQuery">筛选</el-button>
                    <el-button @click="handleResetQuery">重置</el-button>
                </div>
            </div>
            <el-table size="large" v-loading="pager.loading" :data="pager.lists">
                <el-table-column label="ID" prop="id" width="80" />
                <el-table-column label="类型" width="90">
                    <template #default="{ row }">
                        <el-tag
                            size="small"
                            :type="resolveContentTypeTagType(row.contentType)"
                        >
                            {{ resolveContentTypeLabel(row.contentType) }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="场景类型" min-width="140">
                    <template #default="{ row }">
                        <div class="banner-position-tags">
                            <el-tag
                                v-for="scene in resolveSceneLabels(row)"
                                :key="`${row.id}-${scene}`"
                                size="small"
                                type="warning"
                                effect="plain"
                            >
                                {{ scene }}
                            </el-tag>
                        </div>
                    </template>
                </el-table-column>
                <el-table-column label="图片" width="120">
                    <template #default="{ row }">
                        <el-image
                            v-if="row.contentType !== 'html' && row.image"
                            :src="row.image"
                            :preview-src-list="[row.image]"
                            fit="cover"
                            style="width: 80px; height: 45px"
                        />
                        <span v-else-if="row.contentType === 'text'" class="text-xs text-gray-500"
                            >渐变文案</span
                        >
                        <span v-else-if="row.contentType === 'html'" class="text-xs text-gray-500"
                            >HTML代码</span
                        >
                        <span v-else>-</span>
                    </template>
                </el-table-column>
                <el-table-column label="标题" prop="title" min-width="150" />
                <el-table-column label="链接" prop="url" min-width="200" show-overflow-tooltip />
                <el-table-column label="位置/slot" min-width="180">
                    <template #default="{ row }">
                        <div class="banner-position-tags">
                            <el-tag
                                v-for="position in resolvePositionLabels(row)"
                                :key="`${row.id}-${position}`"
                                size="small"
                                effect="plain"
                            >
                                {{ position }}
                            </el-tag>
                        </div>
                    </template>
                </el-table-column>
                <el-table-column
                    label="页面标识"
                    prop="pageSlug"
                    min-width="180"
                >
                    <template #default="{ row }">
                        <div class="banner-page-tags">
                            <el-tag
                                v-for="page in resolvePageSlugLabels(row)"
                                :key="`${row.id}-${page}`"
                                size="small"
                                effect="plain"
                                type="info"
                            >
                                {{ page }}
                            </el-tag>
                        </div>
                    </template>
                </el-table-column>
                <el-table-column label="排序" prop="sortOrder" width="80" />
                <el-table-column label="状态" width="80">
                    <template #default="{ row }">
                        <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
                            {{ row.isActive ? '显示' : '隐藏' }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="操作" width="120" fixed="right">
                    <template #default="{ row }">
                        <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
                        <el-button type="danger" link @click="handleDelete(row.id)">删除</el-button>
                    </template>
                </el-table-column>
            </el-table>
            <div class="flex justify-end mt-4">
                <pagination v-model="pager" @change="getLists" />
            </div>
        </el-card>

        <!-- 编辑弹窗 -->
        <el-dialog v-model="showEdit" :title="editData.id ? '编辑广告' : '添加广告'" width="500px">
            <el-form ref="editFormRef" :model="editData" :rules="editRules" label-width="80px">
                <el-form-item label="标题" prop="title">
                    <el-input v-model="editData.title" placeholder="请输入标题" />
                </el-form-item>
                <el-form-item label="描述">
                    <el-input v-model="editData.description" placeholder="广告描述（可选）" />
                </el-form-item>
                <el-form-item v-if="isPageBannerSelected" label="四宫格样式">
                    <el-radio-group
                        :model-value="pageBannerStyle"
                        @update:model-value="handlePageBannerStyleChange"
                    >
                        <el-radio-button label="image">图片卡片</el-radio-button>
                        <el-radio-button label="text">渐变文案</el-radio-button>
                    </el-radio-group>
                    <div class="text-xs text-gray-400 mt-1">
                        页面 Banner 固定四卡样式：可选图片卡片，或标题+简介渐变卡片。
                    </div>
                    <div class="banner-gradient-preview mt-2" v-if="pageBannerStyle === 'text'">
                        <div class="banner-gradient-preview__title">{{ editData.title || '示例标题' }}</div>
                        <div class="banner-gradient-preview__desc">
                            {{ editData.description || '这里展示简介文案，前端将使用渐变背景四卡布局渲染。' }}
                        </div>
                    </div>
                </el-form-item>
                <el-form-item v-else label="内容类型" prop="contentType">
                    <el-radio-group v-model="editData.contentType">
                        <el-radio-button label="image">图片广告</el-radio-button>
                        <el-radio-button label="text">渐变文案</el-radio-button>
                        <el-radio-button label="html">HTML代码</el-radio-button>
                    </el-radio-group>
                </el-form-item>
                <el-form-item v-if="editData.contentType === 'image'" label="图片" prop="image">
                    <el-input
                        v-model="editData.image"
                        placeholder="图片URL（可接上传组件返回地址）"
                    />
                </el-form-item>
                <el-form-item v-else-if="editData.contentType === 'html'" label="HTML代码" prop="htmlContent">
                    <el-input
                        v-model="editData.htmlContent"
                        type="textarea"
                        :rows="6"
                        placeholder="可填写广告脚本/iframe/HTML片段（请确认来源安全）"
                    />
                </el-form-item>
                <el-form-item v-else label="文案说明">
                    <div class="text-xs text-gray-500">
                        渐变文案卡片会使用“标题 + 描述”渲染，建议标题 8-16 字，描述 20-40 字。
                    </div>
                </el-form-item>
                <el-form-item label="链接类型">
                    <el-radio-group v-model="editData.linkType">
                        <el-radio-button label="custom">自定义链接</el-radio-button>
                        <el-radio-button label="page">页面链接</el-radio-button>
                    </el-radio-group>
                </el-form-item>
                <el-form-item v-if="editData.linkType === 'page'" label="页面链接">
                    <el-select
                        v-model="editData.linkPagePath"
                        filterable
                        allow-create
                        default-first-option
                        style="width: 100%"
                        placeholder="请选择页面路径（例如 /p/uiux）"
                    >
                        <el-option
                            v-for="item in bannerLinkOptions"
                            :key="item.value"
                            :label="item.label"
                            :value="item.value"
                        />
                    </el-select>
                    <div class="text-xs text-gray-400 mt-1">
                        支持选择站内页面路径；保存时会自动转换为跳转 URL。
                    </div>
                </el-form-item>
                <el-form-item v-else label="跳转链接">
                    <el-input
                        v-model="editData.linkUrl"
                        placeholder="点击跳转链接（HTML广告可留空）"
                    />
                </el-form-item>
                <el-form-item label="打开方式">
                    <el-select v-model="editData.linkTarget" style="width: 100%">
                        <el-option label="新窗口(_blank)" value="_blank" />
                        <el-option label="当前窗口(_self)" value="_self" />
                    </el-select>
                </el-form-item>
                <el-form-item label="位置" prop="positionList">
                    <el-select
                        v-model="editData.positionList"
                        multiple
                        collapse-tags
                        collapse-tags-tooltip
                        style="width: 100%"
                        placeholder="至少选择一个广告位置"
                    >
                        <el-option-group
                            v-for="group in bannerPositionOptionGroups"
                            :key="group.label"
                            :label="group.label"
                        >
                            <el-option
                                v-for="item in group.options"
                                :key="item.value"
                                :label="item.label"
                                :value="item.value"
                            />
                        </el-option-group>
                    </el-select>
                    <div class="text-xs text-gray-400 mt-1">支持多选，保存后会在所有选中位置生效。</div>
                </el-form-item>
                <el-form-item label="显示页面" prop="pageSlugList">
                    <el-select
                        v-model="editData.pageSlugList"
                        multiple
                        filterable
                        allow-create
                        default-first-option
                        collapse-tags
                        collapse-tags-tooltip
                        style="width: 100%"
                        placeholder="默认 all（全部页面），可多选或输入自定义页面标识"
                    >
                        <el-option
                            v-for="item in bannerPageOptions"
                            :key="item.value"
                            :label="item.label"
                            :value="item.value"
                        />
                    </el-select>
                    <div class="text-xs text-gray-400 mt-1">
                        例如：<code>home</code>、<code>daily-hot</code>、<code>rankings</code>、<code
                            >website-detail</code
                        >；选择 <code>all</code> 表示全站通配。
                    </div>
                </el-form-item>
                <el-form-item label="排序">
                    <el-input-number v-model="editData.sortOrder" :min="0" />
                </el-form-item>
                <el-form-item label="状态">
                    <el-switch v-model="editData.isActive" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showEdit = false">取消</el-button>
                <el-button type="primary" :loading="editLoading" @click="handleSubmit"
                    >确定</el-button
                >
            </template>
        </el-dialog>
    </div>
</template>

<script lang="ts" setup name="uiedBanner">
import { uiedBannerList, uiedBannerAdd, uiedBannerEdit, uiedBannerDelete, uiedPageAll } from '@/api/uied'
import { usePaging } from '@/hooks/usePaging'
import feedback from '@/utils/feedback'
import type { FormInstance, FormRules } from 'element-plus'

const defaultQueryParams = {
    keyword: '',
    scene: 'all',
    contentType: 'all',
    status: 'all'
}
const queryParams = reactive({ ...defaultQueryParams })
const { pager, getLists } = usePaging({ fetchFun: uiedBannerList, params: queryParams })

const showEdit = ref(false)
const editLoading = ref(false)
const editFormRef = ref<FormInstance>()
const pageBannerStyle = ref<'image' | 'text'>('image')
const sceneFilterOptions = [
    { label: '全部场景', value: 'all' },
    { label: '页面广告', value: 'page_banner' },
    { label: '首页广告', value: 'home' },
    { label: '全局横条', value: 'global_strip' },
    { label: '侧栏广告', value: 'sidebar' },
    { label: '详情广告', value: 'detail' },
    { label: '底部广告', value: 'footer' },
    { label: '其他广告', value: 'other' }
]
const sceneLabelMap: Record<string, string> = {
    page_banner: '页面广告',
    home: '首页广告',
    global_strip: '全局横条',
    sidebar: '侧栏广告',
    detail: '详情广告',
    footer: '底部广告',
    other: '其他广告'
}
const bannerPositionOptionGroups = [
    {
        label: '页面流量位',
        options: [
            { label: '首页（home）', value: 'home' },
            { label: '页面Banner（page_banner）', value: 'page_banner' },
            { label: '全局横条（global_strip）', value: 'global_strip' }
        ]
    },
    {
        label: '详情内容位',
        options: [
            { label: '详情页（detail）', value: 'detail' },
            { label: '详情顶部（detail_top）', value: 'detail_top' },
            { label: '详情正文中（detail_inline）', value: 'detail_inline' },
            { label: '详情底部（detail_bottom）', value: 'detail_bottom' },
            { label: '详情侧栏（detail_sidebar）', value: 'detail_sidebar' }
        ]
    },
    {
        label: '辅助展示位',
        options: [
            { label: '侧边栏（sidebar）', value: 'sidebar' },
            { label: '底部（footer）', value: 'footer' }
        ]
    }
]
const bannerPositionOptions = bannerPositionOptionGroups.flatMap((group) => group.options)
const bannerPositionLabelMap = bannerPositionOptions.reduce<Record<string, string>>((acc, item) => {
    acc[item.value] = item.label
    return acc
}, {})
bannerPositionLabelMap.website_detail_sidebar = bannerPositionLabelMap.detail_sidebar
const bannerPageOptions = [
    { label: '全部页面（all）', value: 'all' },
    { label: '首页（home）', value: 'home' },
    { label: '每日热榜（daily-hot）', value: 'daily-hot' },
    { label: '榜单系统（rankings）', value: 'rankings' },
    { label: '每日上新（daily-new）', value: 'daily-new' },
    { label: '分类页（category）', value: 'category' },
    { label: '标签页（tag）', value: 'tag' },
    { label: '网址详情（website-detail）', value: 'website-detail' },
    { label: '文章详情（article-detail）', value: 'article-detail' },
    { label: '搜索页（search）', value: 'search' }
]
const bannerPageLabelMap = bannerPageOptions.reduce<Record<string, string>>((acc, item) => {
    acc[item.value] = item.label
    return acc
}, {})
bannerPageLabelMap['/'] = bannerPageLabelMap.home
bannerPageLabelMap.index = bannerPageLabelMap.home
bannerPageLabelMap.uiux = bannerPageLabelMap.home
bannerPageLabelMap.website_detail = bannerPageLabelMap['website-detail']
bannerPageLabelMap.article_detail = bannerPageLabelMap['article-detail']

interface BannerLinkOption {
    label: string
    value: string
}

const bannerLinkBuiltinOptions: BannerLinkOption[] = [
    { label: '首页（/）', value: '/' },
    { label: '热门内容（/p/hot）', value: '/p/hot' },
    { label: '文章中心（/articles）', value: '/articles' },
    { label: 'MCP中心（/mcp）', value: '/mcp' },
    { label: '搜索页（/search）', value: '/search' },
    { label: '每日热榜（/p/hot?tab=daily-hot）', value: '/p/hot?tab=daily-hot' },
    { label: '每日上新（/p/hot?tab=daily-new）', value: '/p/hot?tab=daily-new' },
    { label: '榜单系统（/p/hot?tab=rankings）', value: '/p/hot?tab=rankings' }
]
const bannerDynamicPageOptions = ref<BannerLinkOption[]>([])

/**
 * Banner 页面链接候选项（内置页面 + 后台动态页面）。
 */
const bannerLinkOptions = computed<BannerLinkOption[]>(() => {
    const dedup = new Map<string, BannerLinkOption>()
    ;[...bannerLinkBuiltinOptions, ...bannerDynamicPageOptions.value].forEach((item) => {
        const value = String(item?.value || '').trim()
        if (!value) return
        if (!dedup.has(value)) {
            dedup.set(value, { label: String(item?.label || value).trim() || value, value })
        }
    })
    return Array.from(dedup.values())
})

/**
 * 规范化广告位置列表，兼容数组与逗号分隔字符串。
 */
const normalizePositionList = (value: unknown): string[] => {
    const source = Array.isArray(value)
        ? value
        : String(value || '')
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean)
    return Array.from(new Set(source.map((item) => String(item).trim()).filter(Boolean)))
}

/**
 * 规范化页面标识列表，兼容数组与逗号分隔字符串。
 */
const normalizePageSlugList = (value: unknown): string[] => {
    const source = Array.isArray(value)
        ? value
        : String(value || '')
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean)
    const normalized = source
        .map((item) => String(item || '').trim().toLowerCase())
        .map((item) => {
            if (!item) return ''
            if (['/', 'index', 'uiux'].includes(item)) return 'home'
            return item
        })
        .filter(Boolean)
    if (normalized.length === 0) return ['all']
    if (normalized.includes('all')) return ['all']
    return Array.from(new Set(normalized))
}

/**
 * 渲染列表“位置/slot”列标签。
 */
const resolvePositionLabels = (row: any): string[] => {
    const values = normalizePositionList(row?.positionList?.length ? row.positionList : row?.position)
    if (values.length === 0) return [ '未设置' ]
    return values.map((value) => bannerPositionLabelMap[value] || value)
}

/**
 * 规范化位置别名，统一映射到可识别位置。
 */
const normalizePositionAlias = (value: string): string => {
    const normalized = String(value || '').trim().toLowerCase()
    const aliasMap: Record<string, string> = {
        top: 'home',
        bottom: 'footer',
        popup: 'detail',
        website_detail_sidebar: 'detail_sidebar',
        'website-detail-sidebar': 'detail_sidebar',
        detall: 'detail',
        detall_top: 'detail_top',
        detall_inline: 'detail_inline',
        detall_bottom: 'detail_bottom',
        detall_sidebar: 'detail_sidebar'
    }
    return aliasMap[normalized] || normalized
}

/**
 * 将广告位置归并到后台可读的“业务场景”。
 */
const resolveSceneFromPosition = (position: string): string => {
    const normalized = normalizePositionAlias(position)
    if (normalized === 'page_banner') return 'page_banner'
    if (['home'].includes(normalized)) return 'home'
    if (['global_strip'].includes(normalized)) return 'global_strip'
    if (['sidebar', 'detail_sidebar'].includes(normalized)) return 'sidebar'
    if (['footer'].includes(normalized)) return 'footer'
    if (['detail', 'detail_top', 'detail_inline', 'detail_bottom'].includes(normalized)) return 'detail'
    return 'other'
}

/**
 * 渲染列表“场景类型”标签。
 */
const resolveSceneLabels = (row: any): string[] => {
    const values = normalizePositionList(row?.positionList?.length ? row.positionList : row?.position)
    if (values.length === 0) return [sceneLabelMap.other]
    const sceneSet = new Set<string>()
    values.forEach((position) => sceneSet.add(resolveSceneFromPosition(position)))
    return Array.from(sceneSet).map((sceneKey) => sceneLabelMap[sceneKey] || sceneLabelMap.other)
}

/**
 * 渲染广告类型标签文案。
 */
const resolveContentTypeLabel = (value: unknown): string => {
    const type = String(value || 'image').toLowerCase()
    const map: Record<string, string> = {
        image: '图片',
        text: '渐变文案',
        html: 'HTML'
    }
    return map[type] || '图片'
}

/**
 * 渲染广告类型标签颜色。
 */
const resolveContentTypeTagType = (value: unknown): '' | 'success' | 'warning' | 'info' => {
    const type = String(value || 'image').toLowerCase()
    if (type === 'html') return 'warning'
    if (type === 'text') return 'info'
    return 'success'
}

/**
 * 页面 Banner 场景下，识别当前是否选中了 page_banner 位置。
 */
const isPageBannerSelected = computed<boolean>(() =>
    normalizePositionList(editData.positionList).includes('page_banner')
)

/**
 * 同步“页面 Banner 样式”与 contentType 字段。
 */
const syncPageBannerStyleByContentType = () => {
    pageBannerStyle.value = editData.contentType === 'text' ? 'text' : 'image'
}

/**
 * 页面 Banner 样式切换：图片卡片/渐变文案。
 */
const handlePageBannerStyleChange = (value: 'image' | 'text') => {
    pageBannerStyle.value = value
    editData.contentType = value
    editData.htmlContent = ''
    if (value === 'text') {
        editData.image = ''
    }
}

/**
 * 渲染列表“显示页面”列标签。
 */
const resolvePageSlugLabels = (row: any): string[] => {
    const values = normalizePageSlugList(row?.pageSlugList?.length ? row.pageSlugList : row?.pageSlug)
    if (values.includes('all')) return [bannerPageLabelMap.all || '全部页面（all）']
    return values.map((value) => bannerPageLabelMap[value] || value)
}

/**
 * 从后端读取页面列表，构建 Banner “页面链接”下拉候选项。
 */
const loadBannerDynamicPageOptions = async () => {
    try {
        const rows = await uiedPageAll()
        const options = (Array.isArray(rows) ? rows : [])
            .map((item: any) => {
                const slug = String(item?.slug || '').trim().toLowerCase()
                const name = String(item?.name || slug || '').trim()
                if (!slug) return null
                return {
                    label: `${name || slug}（/p/${slug}）`,
                    value: `/p/${slug}`
                } as BannerLinkOption
            })
            .filter((item): item is BannerLinkOption => Boolean(item))
        bannerDynamicPageOptions.value = options
    } catch (error) {
        console.warn('加载 Banner 页面链接候选失败:', error)
        bannerDynamicPageOptions.value = []
    }
}

/**
 * 根据已保存的链接 URL 推断当前编辑态（页面链接 / 自定义链接）。
 */
const resolveBannerLinkState = (value: unknown): { linkType: 'custom' | 'page'; linkPagePath: string } => {
    const linkUrl = String(value || '').trim()
    if (!linkUrl) {
        return { linkType: 'custom', linkPagePath: '' }
    }
    const matched = bannerLinkOptions.value.some((item) => item.value === linkUrl)
    if (matched) {
        return { linkType: 'page', linkPagePath: linkUrl }
    }
    return { linkType: 'custom', linkPagePath: '' }
}

/**
 * 生成最终写库链接：页面模式写站内路径，自定义模式写输入 URL。
 */
const resolveFinalBannerLinkUrl = (): string => {
    if (editData.linkType === 'page') {
        return String(editData.linkPagePath || '').trim()
    }
    return String(editData.linkUrl || '').trim()
}

const editData = reactive({
    id: 0,
    title: '',
    description: '',
    image: '',
    url: '',
    linkUrl: '',
    linkType: 'custom' as 'custom' | 'page',
    linkPagePath: '',
    linkTarget: '_blank',
    contentType: 'image',
    htmlContent: '',
    pageSlug: 'all',
    pageSlugList: ['all'] as string[],
    position: 'home',
    positionList: [ 'home' ] as string[],
    sortOrder: 0,
    isActive: true
})
const editRules: FormRules = {
    title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
    image: [
        {
            validator: (_rule, value, callback) => {
                if (editData.contentType === 'html') {
                    callback()
                    return
                }
                if (!String(value || '').trim()) {
                    callback(new Error('请输入图片URL'))
                    return
                }
                callback()
            },
            trigger: 'blur'
        }
    ],
    htmlContent: [
        {
            validator: (_rule, value, callback) => {
                if (editData.contentType !== 'html') {
                    callback()
                    return
                }
                if (!String(value || '').trim()) {
                    callback(new Error('请输入HTML代码'))
                    return
                }
                callback()
            },
            trigger: 'blur'
        }
    ],
    positionList: [
        {
            validator: (_rule, value, callback) => {
                if (normalizePositionList(value).length === 0) {
                    callback(new Error('请至少选择一个广告位置'))
                    return
                }
                callback()
            },
            trigger: 'change'
        }
    ]
}

const resetEditData = () =>
    Object.assign(editData, {
        id: 0,
        title: '',
        description: '',
        image: '',
        url: '',
        linkUrl: '',
        linkType: 'custom',
        linkPagePath: '',
        linkTarget: '_blank',
        contentType: 'image',
        htmlContent: '',
        pageSlug: 'all',
        pageSlugList: ['all'],
        position: 'home',
        positionList: [ 'home' ],
        sortOrder: 0,
        isActive: true
    })
    

const handleAdd = () => {
    resetEditData()
    syncPageBannerStyleByContentType()
    showEdit.value = true
}
const handleEdit = (row: any) => {
    const normalizedLinkUrl = String(row.linkUrl || row.url || '').trim()
    const linkState = resolveBannerLinkState(normalizedLinkUrl)
    Object.assign(editData, {
        ...row,
        linkUrl: normalizedLinkUrl,
        url: normalizedLinkUrl,
        linkType: linkState.linkType,
        linkPagePath: linkState.linkPagePath,
        linkTarget: row.linkTarget || '_blank',
        contentType: row.contentType || 'image',
        htmlContent: row.htmlContent || '',
        pageSlug: row.pageSlug || 'all',
        pageSlugList: normalizePageSlugList(row.pageSlugList?.length ? row.pageSlugList : row.pageSlug),
        positionList: normalizePositionList(row.positionList?.length ? row.positionList : row.position)
    })
    if (editData.positionList.length === 0) {
        editData.positionList = [ 'home' ]
    }
    syncPageBannerStyleByContentType()
    showEdit.value = true
}

const handleSubmit = async () => {
    if (isPageBannerSelected.value && editData.contentType === 'html') {
        editData.contentType = pageBannerStyle.value
    }
    const normalizedLinkUrl = resolveFinalBannerLinkUrl()
    editData.linkUrl = normalizedLinkUrl
    editData.url = normalizedLinkUrl
    if (editData.contentType === 'html') {
        editData.image = ''
    } else if (editData.contentType === 'text') {
        editData.image = ''
        editData.htmlContent = ''
    } else {
        editData.htmlContent = ''
    }
    await editFormRef.value?.validate()
    editLoading.value = true
    try {
        const positionList = normalizePositionList(editData.positionList)
        const pageSlugList = normalizePageSlugList(editData.pageSlugList)
        const submitData = {
            ...editData,
            linkUrl: normalizedLinkUrl,
            url: normalizedLinkUrl,
            pageSlugList,
            pageSlug: pageSlugList.includes('all') ? 'all' : pageSlugList.join(','),
            positionList,
            position: positionList[0] || 'home'
        }
        if (editData.id) {
            await uiedBannerEdit(submitData)
            feedback.msgSuccess('编辑成功')
        } else {
            await uiedBannerAdd(submitData)
            feedback.msgSuccess('添加成功')
        }
        showEdit.value = false
        await getLists()
    } catch (error: any) {
        const validationError = error?.fields ? '请先完善表单必填项' : ''
        feedback.msgError(
            validationError ||
                error?.msg ||
                error?.message ||
                error?.response?.data?.message ||
                '保存广告失败'
        )
    } finally {
        editLoading.value = false
    }
}

const handleDelete = async (id: number) => {
    await feedback.confirm('确定要删除该广告吗？')
    await uiedBannerDelete({ id })
    feedback.msgSuccess('删除成功')
    await getLists()
}

/**
 * 执行 Banner 列表筛选并回到第一页。
 */
const handleQuery = async () => {
    pager.page = 1
    await getLists()
}

/**
 * 重置 Banner 筛选条件。
 */
const handleResetQuery = async () => {
    Object.assign(queryParams, { ...defaultQueryParams })
    pager.page = 1
    await getLists()
}

/**
 * 顶部场景 Tab 切换：点击后直接触发查询。
 */
const handleSceneTabChange = async () => {
    pager.page = 1
    await getLists()
}

/**
 * 打开前端预览页面，帮助运营快速验证广告位是否显示
 */
const getFrontendPreviewBaseUrl = (): string => {
    const { protocol, hostname, origin } = window.location
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `${protocol}//${hostname}:3003`
    }
    return origin
}

/**
 * 打开前端预览页面，自动按当前环境选择域名。
 */
const openPreviewPage = (path: string) => {
    const normalized = String(path || '').startsWith('/') ? path : `/${path}`
    window.open(`${getFrontendPreviewBaseUrl()}${normalized}`, '_blank')
}

getLists()
loadBannerDynamicPageOptions()

/**
 * 监听位置变化：当选中 page_banner 时自动切换为图片/文案样式二选一。
 */
watch(
    () => normalizePositionList(editData.positionList),
    (positions) => {
        if (positions.includes('page_banner') && editData.contentType === 'html') {
            editData.contentType = pageBannerStyle.value
        }
        if (!positions.includes('page_banner') && pageBannerStyle.value === 'text' && editData.contentType === 'text') {
            editData.contentType = 'image'
        }
        syncPageBannerStyleByContentType()
    },
    { deep: true }
)
</script>

<style scoped>
.banner-ops-helper :deep(.el-card__body) {
    padding-top: 12px;
}

.banner-ops-helper__grid {
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    gap: 12px;
}

.banner-ops-helper__card {
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;
    padding: 10px 12px;
    background: var(--el-fill-color-extra-light);
}

.banner-ops-helper__title {
    font-weight: 600;
    margin-bottom: 8px;
}

.banner-ops-helper__row {
    display: grid;
    grid-template-columns: 96px 1fr;
    gap: 8px;
    align-items: start;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    padding: 4px 0;
}

.banner-ops-helper__label {
    font-weight: 600;
    color: var(--el-text-color-primary);
}

.banner-ops-helper__tip {
    margin-top: 8px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    line-height: 1.6;
}

.banner-scene-tabs :deep(.el-tabs__header) {
    margin-bottom: 10px;
}

.banner-scene-tabs :deep(.el-tabs__nav-wrap::after) {
    display: none;
}

.banner-scene-tabs :deep(.el-tabs__item) {
    height: 32px;
    line-height: 32px;
    font-size: 12px;
}

.banner-gradient-preview {
    border-radius: 10px;
    padding: 12px;
    color: #fff;
    background: linear-gradient(135deg, #3b82f6, #6366f1);
}

.banner-gradient-preview__title {
    font-size: 14px;
    font-weight: 600;
}

.banner-gradient-preview__desc {
    margin-top: 6px;
    font-size: 12px;
    line-height: 1.6;
    color: rgba(255, 255, 255, 0.9);
}

.banner-filter-bar {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 12px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;
    background: var(--el-fill-color-extra-light);
}

.banner-filter-form {
    flex: 1;
}

.banner-filter-form :deep(.el-form-item) {
    margin-bottom: 8px;
}

.banner-filter-bar__actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.banner-position-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

.banner-page-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

@media (max-width: 900px) {
    .banner-ops-helper__grid {
        grid-template-columns: 1fr;
    }

    .banner-ops-helper__row {
        grid-template-columns: 1fr;
    }

    .banner-filter-bar {
        flex-direction: column;
        align-items: stretch;
    }
}
</style>
