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
                        <div class="text-xs text-gray-400">
                            按页面场景配置后，可直接新窗口预览效果
                        </div>
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
                            <span class="banner-ops-helper__label">置顶Banner</span>
                            <span>展示在热门推荐上方，可按页面范围独立配置每条广告。</span>
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
                <div class="flex items-center gap-2">
                    <el-button type="primary" @click="handleAdd">
                        <template #icon><icon name="el-icon-Plus" /></template>
                        添加广告
                    </el-button>
                </div>
                <div class="text-gray-400">共 {{ pager.count }} 条广告</div>
            </div>
            <div class="mb-3 banner-group-tabs">
                <div class="banner-group-tabs__label">广告分类</div>
                <el-radio-group v-model="queryParams.sceneGroup" @change="handleSceneGroupChange">
                    <el-radio-button
                        v-for="item in sceneGroupFilterOptions"
                        :key="item.value"
                        :label="item.value"
                    >
                        {{ item.label }}
                    </el-radio-button>
                </el-radio-group>
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
                            <el-option label="广告组件" value="text" />
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
                        <el-tag size="small" :type="resolveContentTypeTagType(row.contentType)">
                            {{ resolveContentTypeLabel(row.contentType) }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="广告形态" min-width="140">
                    <template #default="{ row }">
                        <el-tag size="small" :type="resolveBannerShapeTagType(row)" effect="plain">
                            {{ resolveBannerShapeLabel(row) }}
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
                            >广告组件</span
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
                <el-table-column label="页面标识" prop="pageSlug" min-width="180">
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

        <!-- 编辑侧边弹窗 -->
        <el-drawer
            v-model="showEdit"
            :title="editData.id ? '编辑广告' : '添加广告'"
            direction="rtl"
            size="520px"
            :destroy-on-close="true"
        >
            <el-form ref="editFormRef" :model="editData" :rules="editRules" label-width="80px">
                <el-form-item label="内容类型" prop="contentType">
                    <el-radio-group v-model="editData.contentType">
                        <el-radio-button label="image">图片广告</el-radio-button>
                        <el-radio-button label="text">广告组件</el-radio-button>
                        <el-radio-button label="html">HTML代码</el-radio-button>
                    </el-radio-group>
                </el-form-item>
                <el-alert
                    v-if="!isContentTypeSelected"
                    title="请先选择内容类型，再填写对应配置内容。"
                    type="warning"
                    :closable="false"
                    class="mb-3"
                />
                <template v-else>
                    <div class="banner-form-group">
                        <div class="banner-form-group__title">基础信息</div>
                        <el-form-item label="标题" prop="title">
                            <el-input v-model="editData.title" placeholder="请输入标题" />
                        </el-form-item>
                        <el-form-item label="描述">
                            <el-input
                                v-model="editData.description"
                                placeholder="广告描述（可选）"
                            />
                        </el-form-item>
                    </div>

                    <div class="banner-form-group">
                        <div class="banner-form-group__title">
                            {{ resolveBannerContentConfigTitle(editData.contentType) }}
                        </div>
                        <div class="banner-form-group__tip">
                            {{ resolveBannerContentConfigTip(editData.contentType) }}
                        </div>
                        <el-form-item
                            v-if="editData.contentType === 'image'"
                            label="图片"
                            prop="image"
                        >
                            <el-input
                                v-model="editData.image"
                                placeholder="图片URL（可接上传组件返回地址）"
                            />
                        </el-form-item>
                        <el-form-item
                            v-else-if="editData.contentType === 'html'"
                            label="HTML代码"
                            prop="htmlContent"
                        >
                            <el-input
                                v-model="editData.htmlContent"
                                type="textarea"
                                :rows="6"
                                placeholder="可填写广告脚本/iframe/HTML片段（请确认来源安全）"
                            />
                        </el-form-item>
                        <template v-else>
                            <el-form-item label="组件渲染">
                                <div class="text-xs text-gray-500">
                                    广告组件将使用“标题 + 描述”在前端渲染，无需上传图片。
                                </div>
                            </el-form-item>
                            <template v-if="isPageBannerTextMode">
                                <div class="page-banner-card-editor__header">
                                    <span class="page-banner-card-editor__title">四卡内容配置</span>
                                    <span class="page-banner-card-editor__tip">
                                        仅在「置顶banner广告（page_banner）」生效，可分别设置标题、简介、跳转链接。
                                    </span>
                                </div>
                                <div class="page-banner-card-editor">
                                    <div
                                        v-for="(card, index) in editData.pageBannerCardItems"
                                        :key="`page-banner-card-${index}`"
                                        class="page-banner-card-editor__item"
                                    >
                                        <div class="page-banner-card-editor__item-title">
                                            卡片 {{ index + 1 }}
                                        </div>
                                        <el-form-item label="标题" label-width="60px">
                                            <el-input
                                                v-model="card.title"
                                                :placeholder="`请输入第${index + 1}张卡片标题`"
                                            />
                                        </el-form-item>
                                        <el-form-item label="简介" label-width="60px">
                                            <el-input
                                                v-model="card.description"
                                                type="textarea"
                                                :rows="2"
                                                :placeholder="`请输入第${
                                                    index + 1
                                                }张卡片简介（可选）`"
                                            />
                                        </el-form-item>
                                        <el-form-item label="链接" label-width="60px">
                                            <el-radio-group v-model="card.linkType">
                                                <el-radio-button label="custom"
                                                    >自定义</el-radio-button
                                                >
                                                <el-radio-button label="page"
                                                    >系统页面</el-radio-button
                                                >
                                            </el-radio-group>
                                        </el-form-item>
                                        <el-form-item
                                            v-if="card.linkType === 'page'"
                                            label="页面"
                                            label-width="60px"
                                        >
                                            <el-select
                                                v-model="card.linkPagePath"
                                                filterable
                                                allow-create
                                                default-first-option
                                                style="width: 100%"
                                                :placeholder="`请选择第${index + 1}张卡片系统页面`"
                                            >
                                                <el-option
                                                    v-for="item in bannerLinkOptions"
                                                    :key="item.value"
                                                    :label="item.label"
                                                    :value="item.value"
                                                />
                                            </el-select>
                                        </el-form-item>
                                        <el-form-item v-else label="链接" label-width="60px">
                                            <el-input
                                                v-model="card.linkUrl"
                                                :placeholder="`请输入第${
                                                    index + 1
                                                }张卡片跳转链接（可选）`"
                                            />
                                        </el-form-item>
                                        <el-form-item label="角标" label-width="60px">
                                            <el-input
                                                v-model="card.badgeText"
                                                :placeholder="`请输入第${
                                                    index + 1
                                                }张卡片角标（可选）`"
                                            />
                                        </el-form-item>
                                    </div>
                                </div>
                            </template>
                        </template>
                    </div>

                    <div v-if="editData.contentType !== 'text'" class="banner-form-group">
                        <div class="banner-form-group__title">链接配置</div>
                        <div class="banner-form-group__tip">
                            {{ resolveBannerLinkConfigTip(editData.contentType) }}
                        </div>
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
                    </div>

                    <div class="banner-form-group">
                        <div class="banner-form-group__title">投放配置</div>
                        <el-form-item label="位置" prop="positionList">
                            <el-select
                                v-model="editData.positionList"
                                multiple
                                collapse-tags
                                collapse-tags-tooltip
                                style="width: 100%"
                                placeholder="请选择一个或多个广告位置"
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
                            <div class="text-xs text-gray-400 mt-1">
                                一条广告可投放到多个位置；如果只想单独控制某个位置，只保留该位置即可。
                            </div>
                        </el-form-item>
                        <el-form-item v-if="showPageScopeConfig" label="页面范围">
                            <el-switch
                                v-model="editData.enablePageScope"
                                active-text="按导航页面限制"
                                inactive-text="全站通配"
                                inline-prompt
                            />
                            <div class="text-xs text-gray-400 mt-1">
                                关闭时默认全站生效；开启后可指定仅在部分导航页面展示。
                            </div>
                        </el-form-item>
                        <el-form-item
                            v-if="showPageScopeConfig && editData.enablePageScope"
                            label="导航页面"
                            prop="pageSlugList"
                        >
                            <el-select
                                v-model="editData.pageSlugList"
                                multiple
                                filterable
                                collapse-tags
                                collapse-tags-tooltip
                                style="width: 100%"
                                placeholder="请选择导航页面（可多选）"
                            >
                                <el-option
                                    v-for="item in bannerDisplayPageOptions"
                                    :key="item.value"
                                    :label="item.label"
                                    :value="item.value"
                                />
                            </el-select>
                            <div class="text-xs text-gray-400 mt-1">
                                仅对导航页面生效，例如：<code>home</code>、<code>daily-hot</code>、<code>rankings</code>。
                            </div>
                        </el-form-item>
                        <el-form-item label="排序">
                            <el-input-number v-model="editData.sortOrder" :min="0" />
                        </el-form-item>
                        <el-form-item label="状态">
                            <el-switch v-model="editData.isActive" />
                        </el-form-item>
                    </div>
                </template>
            </el-form>
            <template #footer>
                <el-button @click="showEdit = false">取消</el-button>
                <el-button type="primary" :loading="editLoading" @click="handleSubmit"
                    >确定</el-button
                >
            </template>
        </el-drawer>
    </div>
</template>

<script lang="ts" setup name="uiedBanner">
import {
    uiedBannerList,
    uiedBannerAdd,
    uiedBannerEdit,
    uiedBannerDelete,
    uiedPageAll
} from '@/api/uied'
import { usePaging } from '@/hooks/usePaging'
import feedback from '@/utils/feedback'
import type { FormInstance, FormRules } from 'element-plus'
import { resolveBannerSubmitHtmlContent } from './bannerForm'

const defaultQueryParams = {
    keyword: '',
    sceneGroup: 'all',
    scene: 'all',
    contentType: 'all',
    status: 'all'
}
const queryParams = reactive({ ...defaultQueryParams })
const { pager, getLists } = usePaging({ fetchFun: uiedBannerList, params: queryParams })

const showEdit = ref(false)
const editLoading = ref(false)
const editFormRef = ref<FormInstance>()
const sceneFilterOptions = [
    { label: '全部场景', value: 'all' },
    { label: '置顶banner广告', value: 'page_banner' },
    { label: '首页广告', value: 'home' },
    { label: '全局横条', value: 'global_strip' },
    { label: '侧栏广告', value: 'sidebar' },
    { label: '详情广告', value: 'detail' },
    { label: '底部广告', value: 'footer' },
    { label: '其他广告', value: 'other' }
]
const sceneGroupFilterOptions = [
    { label: '全部广告', value: 'all' },
    { label: '置顶Banner', value: 'top_banner' },
    { label: '流量入口', value: 'traffic' },
    { label: '内容详情', value: 'content' },
    { label: '侧栏底部', value: 'support' },
    { label: '其他广告', value: 'other' }
]
const sceneLabelMap: Record<string, string> = {
    page_banner: '置顶banner广告',
    home: '首页广告',
    global_strip: '全局横条',
    sidebar: '侧栏广告',
    detail: '详情广告',
    footer: '底部广告',
    other: '其他广告'
}
const FRONTEND_SYSTEM_PAGE_PATH_MAP: Record<string, string> = {
    home: '/',
    uiux: '/',
    index: '/',
    hot: '/p/hot',
    'daily-hot': '/p/hot?tab=daily-hot',
    'daily-new': '/p/hot?tab=daily-new',
    rankings: '/p/hot?tab=rankings',
    mcp: '/mcp',
    figma: '/figma',
    articles: '/articles',
    search: '/search',
    submit: '/submit'
}
const SYSTEM_PAGE_SLUG_SET = new Set<string>(Object.keys(FRONTEND_SYSTEM_PAGE_PATH_MAP))
const NAVIGATION_PAGE_SLUG_SET = new Set<string>([
    'uiux',
    'ai',
    'design',
    '3d',
    'ecommerce',
    'interior',
    'font'
])
const bannerPositionOptionGroups = [
    {
        label: '页面流量位',
        options: [
            { label: '首页（home）', value: 'home' },
            { label: '全局横条（global_strip）', value: 'global_strip' },
            { label: '置顶banner广告（page_banner）', value: 'page_banner' }
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
    { label: 'Figma中心（figma）', value: 'figma' },
    { label: 'MCP中心（mcp）', value: 'mcp' },
    { label: '文章中心（articles）', value: 'articles' },
    { label: '投稿页（submit）', value: 'submit' },
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

const PAGE_BANNER_POSITION = 'page_banner'

interface PageBannerCardItem {
    title: string
    description: string
    linkUrl: string
    badgeText: string
    linkType: 'custom' | 'page'
    linkPagePath: string
}

/**
 * 创建默认四卡配置（固定 4 张卡片）。
 */
const createDefaultPageBannerCardItems = (): PageBannerCardItem[] =>
    Array.from({ length: 4 }, () => ({
        title: '',
        description: '',
        linkUrl: '',
        badgeText: '',
        linkType: 'custom',
        linkPagePath: ''
    }))

/**
 * 规范化四卡配置，确保始终为 4 条并清洗字段。
 */
const normalizePageBannerCardItems = (value: unknown): PageBannerCardItem[] => {
    const source = Array.isArray(value) ? value : []
    const normalized = source.slice(0, 4).map((item: any) => ({
        title: String(item?.title || '').trim(),
        description: String(item?.description || '').trim(),
        linkUrl: String(item?.linkUrl || '').trim(),
        badgeText: String(item?.badgeText || '').trim(),
        linkType: 'custom' as 'custom' | 'page',
        linkPagePath: ''
    }))
    while (normalized.length < 4) {
        normalized.push({
            title: '',
            description: '',
            linkUrl: '',
            badgeText: '',
            linkType: 'custom',
            linkPagePath: ''
        })
    }
    return normalized.map((item) => {
        const linkState = resolveBannerLinkState(item.linkUrl)
        return {
            ...item,
            linkType: linkState.linkType,
            linkPagePath: linkState.linkPagePath
        }
    })
}

/**
 * 从 htmlContent 中解析四卡配置（JSON），解析失败时回退默认值。
 */
const parsePageBannerCardItemsFromHtmlContent = (value: unknown): PageBannerCardItem[] => {
    const raw = String(value || '').trim()
    if (!raw) return createDefaultPageBannerCardItems()
    try {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
            return normalizePageBannerCardItems(parsed)
        }
        if (parsed && Array.isArray(parsed.cardItems)) {
            return normalizePageBannerCardItems(parsed.cardItems)
        }
        return createDefaultPageBannerCardItems()
    } catch (_error) {
        return createDefaultPageBannerCardItems()
    }
}

/**
 * 将四卡配置序列化到 htmlContent，供前端广告组件读取。
 */
const buildPageBannerCardItemsStorage = (items: PageBannerCardItem[]): string => {
    const normalized = normalizePageBannerCardItems(items).map((item) => ({
        title: item.title,
        description: item.description,
        linkUrl:
            item.linkType === 'page'
                ? String(item.linkPagePath || '').trim()
                : String(item.linkUrl || '').trim(),
        badgeText: item.badgeText
    }))
    return JSON.stringify({
        schema: 'page_banner_cards_v1',
        cardItems: normalized
    })
}

/**
 * 判断页面是否属于“导航页面”，用于广告显示页面范围选择。
 */
const isNavigationPageOption = (page: any): boolean => {
    const pageType = String(page?.type || '')
        .trim()
        .toLowerCase()
    if (['navigation', 'nav', 'channel', 'home'].includes(pageType)) {
        return true
    }
    const slug = String(page?.slug || '')
        .trim()
        .toLowerCase()
    if (NAVIGATION_PAGE_SLUG_SET.has(slug)) return true
    return ['home', 'daily-hot', 'daily-new', 'rankings'].includes(slug)
}

const bannerLinkBuiltinOptions: BannerLinkOption[] = [
    { label: '首页（/）', value: '/' },
    { label: '热门内容（/p/hot）', value: '/p/hot' },
    { label: '文章中心（/articles）', value: '/articles' },
    { label: 'MCP中心（/mcp）', value: '/mcp' },
    { label: 'Figma中心（/figma）', value: '/figma' },
    { label: '投稿页（/submit）', value: '/submit' },
    { label: '搜索页（/search）', value: '/search' },
    { label: '每日热榜（/p/hot?tab=daily-hot）', value: '/p/hot?tab=daily-hot' },
    { label: '每日上新（/p/hot?tab=daily-new）', value: '/p/hot?tab=daily-new' },
    { label: '榜单系统（/p/hot?tab=rankings）', value: '/p/hot?tab=rankings' }
]
const bannerDynamicPageOptions = ref<BannerLinkOption[]>([])
const bannerDisplayPageDynamicOptions = ref<BannerLinkOption[]>([])
const currentEditingBannerId = ref(0)
const rawBannerRowMap = ref<Map<number, any>>(new Map())
const rawBannerRowsLoaded = ref(false)

/**
 * Banner 显示页面候选项（仅导航页面，不含 all）。
 */
const bannerDisplayBuiltinPageOptions: BannerLinkOption[] = bannerPageOptions
    .filter((item) => item.value !== 'all')
    .map((item) => ({ ...item }))

/**
 * Banner “显示页面（导航页面）”候选项。
 */
const bannerDisplayPageOptions = computed<BannerLinkOption[]>(() => {
    const dedup = new Map<string, BannerLinkOption>()
    ;[...bannerDisplayBuiltinPageOptions, ...bannerDisplayPageDynamicOptions.value].forEach(
        (item) => {
            const value = String(item?.value || '')
                .trim()
                .toLowerCase()
            if (!value || value === 'all') return
            if (!dedup.has(value)) {
                dedup.set(value, { label: String(item?.label || value).trim() || value, value })
            }
        }
    )
    return Array.from(dedup.values())
})

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
 * 判断四卡项是否完全为空（标题/简介/链接/角标都为空）。
 */
const isEmptyPageBannerCardItem = (item: PageBannerCardItem): boolean =>
    !String(item.title || '').trim() &&
    !String(item.description || '').trim() &&
    !String(item.linkUrl || '').trim() &&
    !String(item.badgeText || '').trim()

/**
 * 加载原始广告数据（不聚合），用于兼容旧四卡分组编辑回填。
 */
const ensureRawBannerRowsLoaded = async (force = false) => {
    if (!force && rawBannerRowsLoaded.value && rawBannerRowMap.value.size > 0) return
    const result = await uiedBannerList({
        pageNo: 1,
        pageSize: 3000,
        keyword: '',
        sceneGroup: 'all',
        scene: 'all',
        contentType: 'all',
        status: 'all',
        raw: 1
    })
    const rows = Array.isArray((result as any)?.lists) ? (result as any).lists : []
    const nextMap = new Map<number, any>()
    rows.forEach((item: any) => {
        const id = Number(item?.id || 0)
        if (id > 0) nextMap.set(id, item)
    })
    rawBannerRowMap.value = nextMap
    rawBannerRowsLoaded.value = true
}

/**
 * 从旧四卡分组记录回填编辑态四卡配置。
 */
const buildLegacyPageBannerCardItems = (row: any): PageBannerCardItem[] => {
    const groupItemIds = Array.isArray(row?.groupItemIds)
        ? row.groupItemIds.map((item: any) => Number(item || 0)).filter((id: number) => id > 0)
        : []
    if (groupItemIds.length === 0) return createDefaultPageBannerCardItems()
    const rows = groupItemIds
        .map((id: number) => rawBannerRowMap.value.get(id))
        .filter((item: any) => Boolean(item))
        .sort(
            (a: any, b: any) =>
                Number(a?.sortOrder || a?.sort || 0) - Number(b?.sortOrder || b?.sort || 0)
        )
    if (rows.length === 0) return createDefaultPageBannerCardItems()
    const cardItems = rows.slice(0, 4).map((item: any) => {
        const link = String(item?.linkUrl || item?.url || '').trim()
        const linkState = resolveBannerLinkState(link)
        return {
            title: String(item?.title || '').trim(),
            description: String(item?.description || '').trim(),
            linkUrl: link,
            badgeText: '',
            linkType: linkState.linkType,
            linkPagePath: linkState.linkPagePath
        } as PageBannerCardItem
    })
    return normalizePageBannerCardItems(cardItems)
}

/**
 * 将页面 slug 转换为前端可访问路径。
 */
const resolveFrontendPathBySlug = (slug: unknown): string => {
    const normalizedSlug = String(slug || '')
        .trim()
        .toLowerCase()
    if (!normalizedSlug) return ''
    if (FRONTEND_SYSTEM_PAGE_PATH_MAP[normalizedSlug]) {
        return FRONTEND_SYSTEM_PAGE_PATH_MAP[normalizedSlug]
    }
    return `/p/${normalizedSlug}`
}

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
    return Array.from(
        new Set(source.map((item) => normalizePositionAlias(String(item).trim())).filter(Boolean))
    )
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
        .map((item) =>
            String(item || '')
                .trim()
                .toLowerCase()
        )
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
 * 规范化“指定页面范围”列表：仅保留具体页面，不允许 all。
 */
const normalizeSpecificPageSlugList = (value: unknown): string[] => {
    const source = Array.isArray(value)
        ? value
        : String(value || '')
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean)
    const normalized = source
        .map((item) =>
            String(item || '')
                .trim()
                .toLowerCase()
        )
        .map((item) => {
            if (!item) return ''
            if (['/', 'index', 'uiux'].includes(item)) return 'home'
            return item
        })
        .filter((item) => Boolean(item) && item !== 'all')
    return Array.from(new Set(normalized))
}

/**
 * 渲染列表“位置/slot”列标签。
 */
const resolvePositionLabels = (row: any): string[] => {
    const values = normalizePositionList(
        row?.positionList?.length ? row.positionList : row?.position
    )
    if (values.length === 0) return ['未设置']
    return values.map((value) => bannerPositionLabelMap[value] || value)
}

/**
 * 规范化位置别名，统一映射到可识别位置。
 */
function normalizePositionAlias(value: string): string {
    const normalized = String(value || '')
        .trim()
        .toLowerCase()
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
    if (['detail', 'detail_top', 'detail_inline', 'detail_bottom'].includes(normalized))
        return 'detail'
    return 'other'
}

/**
 * 渲染列表“场景类型”标签。
 */
const resolveSceneLabels = (row: any): string[] => {
    const values = normalizePositionList(
        row?.positionList?.length ? row.positionList : row?.position
    )
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
        text: '广告组件',
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
 * 渲染“广告形态”标签文案，突出 page_banner 与普通广告的差异。
 */
const resolveBannerShapeLabel = (row: any): string => {
    const contentType = String(row?.contentType || 'image')
        .trim()
        .toLowerCase()
    const positions = normalizePositionList(
        row?.positionList?.length ? row.positionList : row?.position
    )
    const typeLabelMap: Record<string, string> = {
        image: '图片广告',
        text: '广告组件',
        html: 'HTML广告'
    }
    const contentTypeLabel = typeLabelMap[contentType] || typeLabelMap.image
    if (!positions.includes(PAGE_BANNER_POSITION)) return contentTypeLabel
    if (contentType === 'html') {
        return '置顶Banner · HTML'
    }
    if (contentType === 'text') {
        return '置顶Banner · 组件'
    }
    return '置顶Banner · 图片'
}

/**
 * 渲染“广告形态”标签颜色。
 */
const resolveBannerShapeTagType = (row: any): '' | 'success' | 'warning' | 'info' | 'danger' => {
    const contentType = String(row?.contentType || 'image')
        .trim()
        .toLowerCase()
    const positions = normalizePositionList(
        row?.positionList?.length ? row.positionList : row?.position
    )
    if (!positions.includes(PAGE_BANNER_POSITION)) return 'info'
    if (contentType === 'html') return 'warning'
    if (contentType === 'text') return 'success'
    return 'danger'
}

/**
 * 按当前内容类型返回“内容配置”分组标题。
 */
const resolveBannerContentConfigTitle = (contentType: unknown): string => {
    const type = String(contentType || '')
        .trim()
        .toLowerCase()
    if (type === 'html') return 'HTML 广告配置'
    if (type === 'text') return '广告组件配置'
    return '图片广告配置'
}

/**
 * 按当前内容类型返回“内容配置”分组提示文案。
 */
const resolveBannerContentConfigTip = (contentType: unknown): string => {
    const type = String(contentType || '')
        .trim()
        .toLowerCase()
    if (type === 'html') {
        return '用于投放脚本/iframe/自定义代码片段，建议先在测试环境验证展示效果。'
    }
    if (type === 'text') {
        return '用于前端广告组件渲染，重点维护标题与描述，不依赖图片。'
    }
    return '用于常规图片广告投放，建议使用稳定的图片地址并控制体积。'
}

/**
 * 按当前内容类型返回“链接配置”分组提示文案。
 */
const resolveBannerLinkConfigTip = (contentType: unknown): string => {
    const type = String(contentType || '')
        .trim()
        .toLowerCase()
    if (type === 'html') {
        return 'HTML 广告可不填跳转链接；如需跳转，请在链接类型中配置。'
    }
    return '支持外链与站内路径两种方式，页面路径保存时会自动转换为站内跳转地址。'
}

/**
 * 渲染列表“显示页面”列标签。
 */
const resolvePageSlugLabels = (row: any): string[] => {
    const values = normalizePageSlugList(
        row?.pageSlugList?.length ? row.pageSlugList : row?.pageSlug
    )
    if (values.includes('all')) return [bannerPageLabelMap.all || '全部页面（all）']
    return values.map((value) => bannerPageLabelMap[value] || value)
}

/**
 * 从后端读取页面列表，构建 Banner “页面链接”下拉候选项。
 */
const loadBannerDynamicPageOptions = async () => {
    try {
        const rows = await uiedPageAll()
        const safeRows = Array.isArray(rows) ? rows : []
        const options = safeRows
            .map((item: any) => {
                const slug = String(item?.slug || '')
                    .trim()
                    .toLowerCase()
                const name = String(item?.name || slug || '').trim()
                if (!slug) return null
                const frontendPath = resolveFrontendPathBySlug(slug)
                if (!frontendPath) return null
                return {
                    label: `${name || slug}（${frontendPath}）`,
                    value: frontendPath
                } as BannerLinkOption
            })
            .filter((item): item is BannerLinkOption => Boolean(item))
        bannerDynamicPageOptions.value = options
        bannerDisplayPageDynamicOptions.value = safeRows
            .filter((item: any) => {
                const slug = String(item?.slug || '')
                    .trim()
                    .toLowerCase()
                return isNavigationPageOption(item) || SYSTEM_PAGE_SLUG_SET.has(slug)
            })
            .map((item: any) => {
                const slug = String(item?.slug || '')
                    .trim()
                    .toLowerCase()
                const name = String(item?.name || slug || '').trim()
                if (!slug || slug === 'all') return null
                return {
                    label: `${name || slug}（${slug}）`,
                    value: slug
                } as BannerLinkOption
            })
            .filter((item): item is BannerLinkOption => Boolean(item))
        bannerDisplayPageDynamicOptions.value.forEach((item) => {
            if (!bannerPageLabelMap[item.value]) {
                bannerPageLabelMap[item.value] = item.label
            }
        })
    } catch (error) {
        console.warn('加载 Banner 页面链接候选失败:', error)
        bannerDynamicPageOptions.value = []
        bannerDisplayPageDynamicOptions.value = []
    }
}

/**
 * 根据已保存的链接 URL 推断当前编辑态（页面链接 / 自定义链接）。
 */
const resolveBannerLinkState = (
    value: unknown
): { linkType: 'custom' | 'page'; linkPagePath: string } => {
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

/**
 * 判断两个字符串数组是否完全一致（顺序与内容都一致）。
 * @param source 源数组
 * @param target 目标数组
 */
const isSameStringArray = (source: string[], target: string[]): boolean => {
    if (!Array.isArray(source) || !Array.isArray(target)) return false
    if (source.length !== target.length) return false
    return source.every((item, index) => item === target[index])
}

const editData = reactive({
    id: 0,
    oldId: '',
    title: '',
    description: '',
    image: '',
    url: '',
    linkUrl: '',
    linkType: 'custom' as 'custom' | 'page',
    linkPagePath: '',
    linkTarget: '_blank',
    contentType: '',
    htmlContent: '',
    enablePageScope: false,
    pageSlug: 'all',
    pageSlugList: ['all'] as string[],
    position: 'home',
    positionList: ['home'] as string[],
    pageBannerCardItems: createDefaultPageBannerCardItems() as PageBannerCardItem[],
    startTime: 0,
    endTime: 0,
    sortOrder: 0,
    isActive: true
})

/**
 * 判断是否已选择有效广告内容类型（用于分步显示配置项）。
 */
const isContentTypeSelected = computed<boolean>(() =>
    ['image', 'text', 'html'].includes(String(editData.contentType || '').toLowerCase())
)

/**
 * 仅在“广告组件 + 置顶banner广告位置”时启用四卡配置。
 */
const isPageBannerTextMode = computed<boolean>(() => {
    const isTextType = String(editData.contentType || '').toLowerCase() === 'text'
    const positions = normalizePositionList(editData.positionList)
    return isTextType && positions.includes(PAGE_BANNER_POSITION)
})

/**
 * 所有广告类型均支持页面范围，便于按页面独立运营。
 */
const showPageScopeConfig = computed<boolean>(() => isContentTypeSelected.value)
const editRules: FormRules = {
    contentType: [{ required: true, message: '请先选择内容类型', trigger: 'change' }],
    title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
    image: [
        {
            validator: (_rule, value, callback) => {
                if (editData.contentType !== 'image') {
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
    ],
    pageSlugList: [
        {
            validator: (_rule, value, callback) => {
                if (!showPageScopeConfig.value || !editData.enablePageScope) {
                    callback()
                    return
                }
                if (normalizeSpecificPageSlugList(value).length === 0) {
                    callback(new Error('请至少选择一个导航页面'))
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
        oldId: '',
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
        enablePageScope: false,
        pageSlug: 'all',
        pageSlugList: ['all'],
        position: 'home',
        positionList: ['home'],
        pageBannerCardItems: createDefaultPageBannerCardItems(),
        startTime: 0,
        endTime: 0,
        sortOrder: 0,
        isActive: true
    })

const handleAdd = () => {
    resetEditData()
    currentEditingBannerId.value = 0
    showEdit.value = true
}
const handleEdit = async (row: any) => {
    const normalizedPositionList = normalizePositionList(
        row?.positionList?.length ? row.positionList : row?.position
    )
    currentEditingBannerId.value = Number(row?.id || 0)
    const normalizedEditablePositionList =
        normalizedPositionList.length > 0 ? normalizedPositionList : ['home']
    const normalizedLinkUrl = String(row.linkUrl || row.url || '').trim()
    const linkState = resolveBannerLinkState(normalizedLinkUrl)
    const pageBannerCardItems = parsePageBannerCardItemsFromHtmlContent(row.htmlContent || '')
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
        pageSlugList: normalizePageSlugList(
            row.pageSlugList?.length ? row.pageSlugList : row.pageSlug
        ),
        positionList: normalizedEditablePositionList,
        pageBannerCardItems
    })
    const isPageBannerTextRow =
        String(editData.contentType || '').toLowerCase() === 'text' &&
        normalizedEditablePositionList.includes(PAGE_BANNER_POSITION)
    const hasValidCardItem = editData.pageBannerCardItems.some(
        (item) => !isEmptyPageBannerCardItem(item)
    )
    if (isPageBannerTextRow && !hasValidCardItem) {
        try {
            await ensureRawBannerRowsLoaded()
            editData.pageBannerCardItems = buildLegacyPageBannerCardItems(row)
        } catch (error) {
            console.warn('回填旧四卡配置失败:', error)
        }
    }
    editData.enablePageScope = !editData.pageSlugList.includes('all')
    if (editData.positionList.length === 0) {
        editData.positionList = ['home']
    }
    showEdit.value = true
}

const handleSubmit = async () => {
    if (!isContentTypeSelected.value) {
        feedback.msgError('请先选择内容类型')
        return
    }
    const isPageBannerText = isPageBannerTextMode.value
    const normalizedLinkUrl = resolveFinalBannerLinkUrl()
    editData.linkUrl = normalizedLinkUrl
    editData.url = normalizedLinkUrl
    if (editData.contentType === 'html') {
        editData.image = ''
    } else if (editData.contentType === 'text') {
        editData.image = ''
        editData.htmlContent = ''
        editData.linkType = 'custom'
        editData.linkPagePath = ''
        editData.linkUrl = ''
        editData.url = ''
        if (isPageBannerText) {
            const normalizedCardItems = normalizePageBannerCardItems(editData.pageBannerCardItems)
            const validCardItems = normalizedCardItems.filter((item) =>
                Boolean(
                    item.title ||
                        item.description ||
                        (item.linkType === 'page' ? item.linkPagePath : item.linkUrl) ||
                        item.badgeText
                )
            )
            if (validCardItems.length === 0) {
                feedback.msgError('请至少配置一张四卡内容（标题/简介/链接任一项）')
                return
            }
            editData.pageBannerCardItems = normalizedCardItems
            editData.htmlContent = buildPageBannerCardItemsStorage(normalizedCardItems)
            if (!String(editData.title || '').trim()) {
                editData.title = '置顶banner广告'
            }
            if (!String(editData.description || '').trim()) {
                editData.description = `四卡广告（已配置 ${validCardItems.length} 张）`
            }
        } else {
            editData.htmlContent = ''
        }
    } else {
        editData.htmlContent = ''
    }
    await editFormRef.value?.validate()
    editLoading.value = true
    try {
        const editingId = Number(currentEditingBannerId.value || editData.id || 0)
        const positionList = normalizePositionList(editData.positionList)
        const pageSlugList =
            showPageScopeConfig.value && editData.enablePageScope
                ? normalizeSpecificPageSlugList(editData.pageSlugList)
                : ['all']
        const submitData = {
            ...editData,
            id: editingId,
            linkUrl: editData.contentType === 'text' ? '' : normalizedLinkUrl,
            url: editData.contentType === 'text' ? '' : normalizedLinkUrl,
            htmlContent: resolveBannerSubmitHtmlContent(
                editData.contentType,
                editData.htmlContent
            ),
            pageSlugList,
            pageSlug: pageSlugList.includes('all') ? 'all' : pageSlugList.join(','),
            positionList,
            position: positionList.join(',')
        }
        if (editingId > 0) {
            await uiedBannerEdit(submitData)
            feedback.msgSuccess('编辑成功')
        } else {
            await uiedBannerAdd(submitData)
            feedback.msgSuccess('添加成功')
        }
        currentEditingBannerId.value = 0
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
 * 顶部“广告分类”切换：先归并到分类，再通过场景 Tab 做细分。
 */
const handleSceneGroupChange = async () => {
    queryParams.scene = 'all'
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

/**
 * 监听页面范围开关：关闭时自动切回 all；开启时清空 all 让运营选择具体导航页面。
 */
watch(
    () => editData.enablePageScope,
    (enabled) => {
        if (enabled) {
            if (editData.pageSlugList.includes('all')) {
                editData.pageSlugList = []
            }
            return
        }
        if (!isSameStringArray(editData.pageSlugList, ['all'])) {
            editData.pageSlugList = ['all']
        }
    }
)

/**
 * 规范化位置数组，去重并保留合法值。
 */
watch(
    () => editData.positionList,
    (value) => {
        const normalized = normalizePositionList(value)
        const nextValue = normalized.length > 0 ? normalized : ['home']
        if (!isSameStringArray(editData.positionList, nextValue)) {
            editData.positionList = [...nextValue]
        }
    }
)

getLists()
loadBannerDynamicPageOptions()
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

.banner-group-tabs {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.banner-group-tabs__label {
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

.banner-group-tabs :deep(.el-radio-button__inner) {
    font-size: 12px;
    height: 30px;
    line-height: 30px;
    padding: 0 12px;
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

.banner-form-group {
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;
    padding: 10px 12px 4px;
    background: var(--el-fill-color-extra-light);
    margin-bottom: 10px;
}

.banner-form-group__title {
    font-size: 13px;
    font-weight: 600;
    color: var(--el-text-color-primary);
    margin-bottom: 6px;
}

.banner-form-group__tip {
    font-size: 12px;
    line-height: 1.6;
    color: var(--el-text-color-secondary);
    margin-bottom: 8px;
}

.page-banner-card-editor__header {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin: 6px 0 10px;
}

.page-banner-card-editor__title {
    font-size: 13px;
    font-weight: 600;
    color: var(--el-text-color-primary);
}

.page-banner-card-editor__tip {
    font-size: 12px;
    line-height: 1.5;
    color: var(--el-text-color-secondary);
}

.page-banner-card-editor {
    display: grid;
    gap: 10px;
}

.page-banner-card-editor__item {
    border: 1px dashed var(--el-border-color);
    border-radius: 10px;
    padding: 10px 10px 2px;
    background: var(--el-bg-color-overlay);
}

.page-banner-card-editor__item-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--el-text-color-regular);
    margin-bottom: 6px;
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

    .banner-form-group {
        padding: 10px;
    }
}
</style>
