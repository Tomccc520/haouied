<!--
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-05
 */
-->
<template>
    <div class="hot-articles-setting">
        <el-card shadow="never" class="hot-articles-setting__card">
            <template #header>
                <div class="hot-articles-setting__header">
                    <div>
                        <h2>热门文章（Hot）配置</h2>
                        <p>用于管理前台 <code>/p/hot</code> 页面与入口展示，文章内容来源为 WordPress 频道（默认 uied.cn）。</p>
                    </div>
                    <div class="hot-articles-setting__actions">
                        <el-button :loading="loading" @click="loadConfig">刷新</el-button>
                        <el-button type="primary" :loading="saving" @click="handleSave">保存配置</el-button>
                    </div>
                </div>
            </template>

            <el-alert
                type="info"
                :closable="false"
                show-icon
                title="说明：该配置会同时影响首页快捷入口、导航内置入口、页脚内置入口与 /p/hot 页面展示。"
                class="mb-4"
            />

            <el-form label-width="150px" class="hot-articles-setting__form">
                <el-form-item label="启用热门文章">
                    <el-switch v-model="formData.enabled" />
                </el-form-item>

                <el-divider content-position="left">入口展示</el-divider>

                <el-form-item label="入口文案">
                    <el-input v-model="formData.displayLabel" :disabled="!formData.enabled" />
                </el-form-item>
                <el-form-item label="入口路径">
                    <el-input v-model="formData.displayPath" :disabled="!formData.enabled" placeholder="/p/hot" />
                </el-form-item>
                <el-form-item label="显示位置">
                    <el-checkbox-group v-model="formData.displayPlacements" :disabled="!formData.enabled">
                        <el-checkbox label="nav_quick_entry">首页快捷入口</el-checkbox>
                        <el-checkbox label="home_menu">顶部导航菜单</el-checkbox>
                        <el-checkbox label="footer_link">页脚链接</el-checkbox>
                    </el-checkbox-group>
                </el-form-item>
                <el-form-item label="入口排序">
                    <el-input-number v-model="formData.displaySort" :min="1" :max="9999" :disabled="!formData.enabled" />
                </el-form-item>
                <el-form-item label="入口新窗口">
                    <el-switch v-model="formData.displayOpenInNewTab" :disabled="!formData.enabled" />
                </el-form-item>

                <el-divider content-position="left">页面文案</el-divider>

                <el-form-item label="页面角标">
                    <el-input v-model="formData.pageKicker" :disabled="!formData.enabled" />
                </el-form-item>
                <el-form-item label="页面标题">
                    <el-input v-model="formData.pageTitle" :disabled="!formData.enabled" />
                </el-form-item>
                <el-form-item label="页面描述">
                    <el-input
                        v-model="formData.pageDescription"
                        type="textarea"
                        :rows="3"
                        :disabled="!formData.enabled"
                    />
                </el-form-item>
                <el-form-item label="头图副标题">
                    <el-input
                        v-model="formData.heroTagline"
                        type="textarea"
                        :rows="2"
                        :disabled="!formData.enabled"
                        placeholder="聚合国内外AI精选内容，探索AI技术前沿与应用"
                    />
                </el-form-item>
                <el-form-item label="启用头部动效">
                    <el-switch v-model="formData.motionEnabled" :disabled="!formData.enabled" />
                </el-form-item>

                <el-divider content-position="left">数据拉取</el-divider>

                <el-form-item label="API来源模式">
                    <el-select v-model="formData.apiSourceMode" :disabled="!formData.enabled">
                        <el-option label="自动（优先 uied/v1，失败回退 wp/v2）" value="auto" />
                        <el-option label="uied/v1 热门接口优先" value="uied_hot" />
                        <el-option label="uied/v1 最新接口优先" value="uied_latest" />
                        <el-option label="强制使用 wp/v2" value="wp_v2" />
                    </el-select>
                </el-form-item>
                <el-form-item label="每页条数">
                    <el-input-number v-model="formData.pageSize" :min="1" :max="100" :disabled="!formData.enabled" />
                </el-form-item>
                <el-form-item label="默认排序字段">
                    <el-select v-model="formData.defaultOrderBy" :disabled="!formData.enabled">
                        <el-option label="发布时间（date）" value="date" />
                        <el-option label="更新时间（modified）" value="modified" />
                        <el-option label="标题（title）" value="title" />
                        <el-option label="ID（id）" value="id" />
                        <el-option label="固定链接（slug）" value="slug" />
                        <el-option label="相关性（relevance）" value="relevance" />
                        <el-option label="浏览量（views，uied接口）" value="views" />
                        <el-option label="评论数（comment_count，uied接口）" value="comment_count" />
                    </el-select>
                </el-form-item>
                <el-form-item label="默认排序方向">
                    <el-radio-group v-model="formData.defaultOrder" :disabled="!formData.enabled">
                        <el-radio label="desc">倒序（desc）</el-radio>
                        <el-radio label="asc">正序（asc）</el-radio>
                    </el-radio-group>
                </el-form-item>
                <el-form-item label="默认分类ID">
                    <el-input-number
                        v-model="formData.defaultCategoryId"
                        :min="0"
                        :max="9999999"
                        :disabled="!formData.enabled"
                    />
                </el-form-item>
                <el-form-item label="默认标签ID">
                    <el-input-number
                        v-model="formData.defaultTagId"
                        :min="0"
                        :max="9999999"
                        :disabled="!formData.enabled"
                    />
                </el-form-item>
                <el-form-item label="文章新窗口">
                    <el-switch v-model="formData.linksNewWindow" :disabled="!formData.enabled" />
                </el-form-item>

                <el-divider content-position="left">筛选预设（迁移 hot 项目）</el-divider>

                <div class="hot-articles-setting__preset-toolbar">
                    <span>可配置顶部筛选项，支持“全部 / 分类 / 标签”三种类型。</span>
                    <el-button size="small" type="primary" plain @click="handleAddPreset">新增筛选项</el-button>
                </div>

                <div class="hot-articles-setting__preset-table">
                    <div class="hot-articles-setting__preset-head">
                        <span>Key</span>
                        <span>名称</span>
                        <span>类型</span>
                        <span>ID</span>
                        <span>描述</span>
                        <span>启用</span>
                        <span>排序</span>
                        <span>操作</span>
                    </div>
                    <div
                        v-for="(item, index) in formData.filterPresets"
                        :key="`${item.key}-${index}`"
                        class="hot-articles-setting__preset-row"
                    >
                        <el-input v-model="item.key" placeholder="key" />
                        <el-input v-model="item.name" placeholder="名称" />
                        <el-select v-model="item.type" placeholder="类型">
                            <el-option label="全部" value="all" />
                            <el-option label="分类" value="category" />
                            <el-option label="标签" value="tag" />
                        </el-select>
                        <el-input-number v-model="item.id" :min="0" :max="9999999" />
                        <el-input v-model="item.description" placeholder="可选描述" />
                        <el-switch v-model="item.enabled" />
                        <el-input-number v-model="item.sort" :min="1" :max="9999" />
                        <el-button
                            type="danger"
                            link
                            :disabled="formData.filterPresets.length <= 1"
                            @click="handleRemovePreset(index)"
                        >
                            删除
                        </el-button>
                    </div>
                </div>

                <el-divider content-position="left">工作台左侧菜单</el-divider>
                <div class="hot-articles-setting__preset-toolbar">
                    <span>左侧菜单完全可配置：名称、模式、数据来源、分类/标签参数、外链与排序。</span>
                    <el-button size="small" type="primary" plain @click="handleAddWorkbenchMenu">新增菜单项</el-button>
                </div>
                <div class="hot-articles-setting__menu-table">
                    <div class="hot-articles-setting__menu-head">
                        <span>Key</span>
                        <span>名称</span>
                        <span>模式</span>
                        <span>图标</span>
                        <span>来源</span>
                        <span>presetKey</span>
                        <span>分类ID</span>
                        <span>标签ID</span>
                        <span>排序字段</span>
                        <span>方向</span>
                        <span>周期</span>
                        <span>外链</span>
                        <span>启用</span>
                        <span>排序</span>
                        <span>操作</span>
                    </div>
                    <div
                        v-for="(item, index) in formData.workbenchMenuItems"
                        :key="`${item.key}-${index}`"
                        class="hot-articles-setting__menu-row"
                    >
                        <el-input v-model="item.key" placeholder="key" />
                        <el-input v-model="item.label" placeholder="菜单名称" />
                        <el-select v-model="item.mode" placeholder="模式">
                            <el-option label="latest" value="latest" />
                            <el-option label="hot" value="hot" />
                            <el-option label="preset" value="preset" />
                            <el-option label="authorHot" value="authorHot" />
                            <el-option label="circle" value="circle" />
                            <el-option label="external" value="external" />
                        </el-select>
                        <el-select v-model="item.iconKey" placeholder="图标">
                            <el-option label="latest（最新文章 / FileText）" value="latest" />
                            <el-option label="hot（热门文章 / Star）" value="hot" />
                            <el-option label="ai（AI实时 / Robot）" value="ai" />
                            <el-option label="product（产品榜 / Trophy）" value="product" />
                            <el-option label="design（设计文章 / Desktop）" value="design" />
                            <el-option label="resource（设计素材 / Appstore）" value="resource" />
                            <el-option label="author（优秀作者 / Crown）" value="author" />
                            <el-option label="circle（学习圈子 / Read）" value="circle" />
                            <el-option label="extra（通用）" value="extra" />
                            <el-option label="home（返回主站 / Home）" value="home" />
                        </el-select>
                        <el-select v-model="item.source" placeholder="来源">
                            <el-option label="auto" value="auto" />
                            <el-option label="uied_hot" value="uied_hot" />
                            <el-option label="uied_latest" value="uied_latest" />
                            <el-option label="wp_v2" value="wp_v2" />
                        </el-select>
                        <el-input v-model="item.presetKey" placeholder="可选" />
                        <el-input-number v-model="item.categoryId" :min="0" :max="9999999" />
                        <el-input-number v-model="item.tagId" :min="0" :max="9999999" />
                        <el-select v-model="item.orderBy" placeholder="字段">
                            <el-option label="date" value="date" />
                            <el-option label="modified" value="modified" />
                            <el-option label="title" value="title" />
                            <el-option label="id" value="id" />
                            <el-option label="slug" value="slug" />
                            <el-option label="relevance" value="relevance" />
                            <el-option label="views" value="views" />
                            <el-option label="comment_count" value="comment_count" />
                        </el-select>
                        <el-select v-model="item.order" placeholder="方向">
                            <el-option label="desc" value="desc" />
                            <el-option label="asc" value="asc" />
                        </el-select>
                        <el-select v-model="item.period" placeholder="周期">
                            <el-option label="all" value="all" />
                            <el-option label="daily" value="daily" />
                            <el-option label="weekly" value="weekly" />
                            <el-option label="monthly" value="monthly" />
                        </el-select>
                        <el-input v-model="item.externalUrl" placeholder="external模式填写" />
                        <el-switch v-model="item.enabled" />
                        <el-input-number v-model="item.sort" :min="1" :max="9999" />
                        <el-button
                            type="danger"
                            link
                            :disabled="formData.workbenchMenuItems.length <= 1"
                            @click="handleRemoveWorkbenchMenu(index)"
                        >
                            删除
                        </el-button>
                    </div>
                </div>
            </el-form>
        </el-card>
    </div>
</template>

<script lang="ts" setup>
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-05
 */
import { onMounted, reactive, ref } from 'vue'
import feedback from '@/utils/feedback'
import { uiedHotArticlesConfigGet, uiedHotArticlesConfigSave } from '@/api/uied'

interface HotFilterPreset {
    key: string
    name: string
    type: 'all' | 'category' | 'tag'
    id: number
    description: string
    enabled: boolean
    sort: number
}

interface HotArticlesConfig {
    enabled: boolean
    displayPlacements: string[]
    displayLabel: string
    displayPath: string
    displaySort: number
    displayOpenInNewTab: boolean
    pageKicker: string
    pageTitle: string
    pageDescription: string
    pageSize: number
    defaultOrderBy: string
    defaultOrder: 'asc' | 'desc'
    defaultCategoryId: number
    defaultTagId: number
    apiSourceMode: 'auto' | 'uied' | 'uied_hot' | 'uied_latest' | 'wp_v2'
    motionEnabled: boolean
    heroTagline: string
    linksNewWindow: boolean
    filterPresets: HotFilterPreset[]
    workbenchMenuItems: HotWorkbenchMenuConfigItem[]
}

interface HotWorkbenchMenuConfigItem {
    key: string
    label: string
    mode: 'latest' | 'hot' | 'preset' | 'authorHot' | 'circle' | 'external'
    iconKey: 'latest' | 'hot' | 'ai' | 'product' | 'design' | 'resource' | 'author' | 'circle' | 'extra' | 'home'
    source: 'auto' | 'uied' | 'uied_hot' | 'uied_latest' | 'wp_v2'
    presetKey: string
    fallbackType: 'category' | 'tag'
    fallbackId: number
    categoryId: number
    tagId: number
    orderBy: string
    order: 'asc' | 'desc'
    period: 'all' | 'daily' | 'weekly' | 'monthly'
    externalUrl: string
    subtitle: string
    enabled: boolean
    sort: number
}

const loading = ref(false)
const saving = ref(false)

/**
 * 默认配置：迁移 hot 项目的预设分类，开箱即用。
 */
const defaultConfig: HotArticlesConfig = {
    enabled: true,
    displayPlacements: ['nav_quick_entry', 'home_menu'],
    displayLabel: '热门文章',
    displayPath: '/p/hot',
    displaySort: 84,
    displayOpenInNewTab: false,
    pageKicker: 'HOT ARTICLES',
    pageTitle: '热门文章',
    pageDescription: '同步 uied.cn 的优质文章内容，快速发现值得阅读的设计与产品洞察。',
    pageSize: 24,
    defaultOrderBy: 'date',
    defaultOrder: 'desc',
    defaultCategoryId: 417,
    defaultTagId: 0,
    apiSourceMode: 'auto',
    motionEnabled: true,
    heroTagline: '聚合国内外AI精选内容，探索AI技术前沿与应用',
    linksNewWindow: true,
    filterPresets: [
        { key: 'all', name: '全部', type: 'all', id: 0, description: '全部热门文章', enabled: true, sort: 10 },
        { key: 'aigc', name: 'AIGC', type: 'category', id: 417, description: 'AIGC 分类内容', enabled: true, sort: 20 },
        { key: 'ai-tools', name: 'AI工具', type: 'category', id: 3351, description: 'AI 工具分类内容', enabled: true, sort: 30 },
        { key: 'productivity', name: '效率工具', type: 'category', id: 338, description: '效率工具分类内容', enabled: true, sort: 40 },
        { key: 'design', name: '设计干货', type: 'category', id: 307, description: '设计干货分类内容', enabled: true, sort: 50 },
    ],
    workbenchMenuItems: [
        { key: 'latest-articles', label: '最新文章', mode: 'latest', iconKey: 'latest', source: 'uied_latest', presetKey: '', fallbackType: 'category', fallbackId: 0, categoryId: 0, tagId: 0, orderBy: 'date', order: 'desc', period: 'all', externalUrl: '', subtitle: '按发布时间实时更新', enabled: true, sort: 10 },
        { key: 'hot-articles', label: '热门文章', mode: 'hot', iconKey: 'hot', source: 'uied_hot', presetKey: '', fallbackType: 'category', fallbackId: 0, categoryId: 417, tagId: 0, orderBy: 'views', order: 'desc', period: 'all', externalUrl: '', subtitle: '按热度优先展示', enabled: true, sort: 20 },
        { key: 'ai-realtime', label: 'AI实时文章', mode: 'preset', iconKey: 'ai', source: 'uied_latest', presetKey: 'aigc', fallbackType: 'category', fallbackId: 417, categoryId: 0, tagId: 0, orderBy: 'date', order: 'desc', period: 'all', externalUrl: '', subtitle: '', enabled: true, sort: 30 },
        { key: 'ai-products', label: 'AI产品榜单', mode: 'preset', iconKey: 'product', source: 'uied_latest', presetKey: 'ai-tools', fallbackType: 'category', fallbackId: 3351, categoryId: 0, tagId: 0, orderBy: 'date', order: 'desc', period: 'all', externalUrl: '', subtitle: '', enabled: true, sort: 40 },
        { key: 'design-articles', label: '设计文章', mode: 'preset', iconKey: 'design', source: 'uied_latest', presetKey: 'design', fallbackType: 'category', fallbackId: 307, categoryId: 0, tagId: 0, orderBy: 'date', order: 'desc', period: 'all', externalUrl: '', subtitle: '', enabled: true, sort: 50 },
        { key: 'design-resources', label: '设计素材', mode: 'preset', iconKey: 'resource', source: 'uied_latest', presetKey: 'productivity', fallbackType: 'category', fallbackId: 338, categoryId: 0, tagId: 0, orderBy: 'date', order: 'desc', period: 'all', externalUrl: '', subtitle: '', enabled: true, sort: 60 },
        { key: 'top-authors', label: '优秀作者', mode: 'authorHot', iconKey: 'author', source: 'uied_hot', presetKey: '', fallbackType: 'category', fallbackId: 0, categoryId: 0, tagId: 0, orderBy: 'comment_count', order: 'desc', period: 'weekly', externalUrl: '', subtitle: '', enabled: true, sort: 70 },
        { key: 'study-circles', label: '学习圈子', mode: 'circle', iconKey: 'circle', source: 'uied_latest', presetKey: '', fallbackType: 'category', fallbackId: 0, categoryId: 0, tagId: 393, orderBy: 'date', order: 'desc', period: 'all', externalUrl: '', subtitle: '', enabled: true, sort: 80 },
        { key: 'back-main-site', label: '返回主站', mode: 'external', iconKey: 'home', source: 'auto', presetKey: '', fallbackType: 'category', fallbackId: 0, categoryId: 0, tagId: 0, orderBy: 'date', order: 'desc', period: 'all', externalUrl: 'https://www.uied.cn', subtitle: '', enabled: true, sort: 999 },
    ],
}

const formData = reactive<HotArticlesConfig>(JSON.parse(JSON.stringify(defaultConfig)))

/**
 * 将输入值转换为受控的路由路径。
 */
const normalizePath = (value: unknown): string => {
    const text = String(value || '').trim()
    if (!text) return '/p/hot'
    if (/^(https?:)?\/\//i.test(text)) return text
    return text.startsWith('/') ? text : `/${text}`
}

/**
 * 规范化筛选配置，保证 key 唯一、排序稳定、类型可控。
 */
const normalizeFilterPresets = (value: unknown): HotFilterPreset[] => {
    const source = Array.isArray(value) ? value : []
    const usedKeySet = new Set<string>()
    const normalized = source
        .map((item: any, index: number) => {
            const key = String(item?.key || '')
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9_-]/g, '') || `preset_${index + 1}`
            if (usedKeySet.has(key)) return null
            usedKeySet.add(key)
            const type = String(item?.type || 'category').trim().toLowerCase()
            const resolvedType: 'all' | 'category' | 'tag' =
                type === 'all' || type === 'tag' ? type : 'category'
            const id = Number.parseInt(String(item?.id || 0), 10)
            return {
                key,
                name: String(item?.name || key).trim() || key,
                type: resolvedType,
                id: Number.isInteger(id) && id > 0 ? id : 0,
                description: String(item?.description || '').trim(),
                enabled: item?.enabled !== false,
                sort: Number.isFinite(Number(item?.sort)) ? Number(item.sort) : (index + 1) * 10,
            }
        })
        .filter((item): item is HotFilterPreset => Boolean(item))
        .sort((a, b) => a.sort - b.sort)
        .map((item, index) => ({ ...item, sort: (index + 1) * 10 }))
    return normalized.length > 0 ? normalized : JSON.parse(JSON.stringify(defaultConfig.filterPresets))
}

/**
 * 统一菜单图标键，兼容 hot 旧项目中的图标别名。
 */
const normalizeMenuIconKey = (value: unknown): HotWorkbenchMenuConfigItem['iconKey'] => {
    const text = String(value || '').trim()
    const lower = text.toLowerCase()
    const allowSet = new Set(['latest', 'hot', 'ai', 'product', 'design', 'resource', 'author', 'circle', 'extra', 'home'])
    if (allowSet.has(text)) return text as HotWorkbenchMenuConfigItem['iconKey']
    if (allowSet.has(lower)) return lower as HotWorkbenchMenuConfigItem['iconKey']
    const aliasMap: Record<string, HotWorkbenchMenuConfigItem['iconKey']> = {
        file: 'latest',
        'file-text': 'latest',
        filetext: 'latest',
        filetextoutlined: 'latest',
        star: 'hot',
        staroutlined: 'hot',
        robot: 'ai',
        robotoutlined: 'ai',
        trophy: 'product',
        trophyoutlined: 'product',
        desktop: 'design',
        desktopoutlined: 'design',
        appstore: 'resource',
        appstoreoutlined: 'resource',
        crown: 'author',
        crownoutlined: 'author',
        read: 'circle',
        readoutlined: 'circle',
        book: 'circle',
        home: 'home',
        homeoutlined: 'home',
    }
    return aliasMap[lower] || 'extra'
}

/**
 * 规范化工作台菜单，保证 mode/source/icon 与排序稳定。
 */
const normalizeWorkbenchMenuItems = (value: unknown): HotWorkbenchMenuConfigItem[] => {
    const source = Array.isArray(value) ? value : []
    const usedKeySet = new Set<string>()
    const allowModeSet = new Set(['latest', 'hot', 'preset', 'authorHot', 'circle', 'external'])
    const allowSourceSet = new Set(['auto', 'uied', 'uied_hot', 'uied_latest', 'wp_v2'])
    const allowOrderBySet = new Set(['date', 'modified', 'id', 'title', 'slug', 'relevance', 'views', 'comment_count'])
    const allowPeriodSet = new Set(['all', 'daily', 'weekly', 'monthly'])
    const normalized = source
        .map((item: any, index: number) => {
            const key = String(item?.key || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || `menu_${index + 1}`
            if (usedKeySet.has(key)) return null
            usedKeySet.add(key)
            const mode = String(item?.mode || 'latest').trim()
            const sourceKey = String(item?.source || 'auto').trim().toLowerCase()
            const orderBy = String(item?.orderBy || 'date').trim().toLowerCase()
            const period = String(item?.period || 'all').trim().toLowerCase()
            const fallbackType = String(item?.fallbackType || 'category').trim().toLowerCase()
            const fallbackId = Number.parseInt(String(item?.fallbackId || 0), 10)
            const categoryId = Number.parseInt(String(item?.categoryId || 0), 10)
            const tagId = Number.parseInt(String(item?.tagId || 0), 10)
            return {
                key,
                label: String(item?.label || key).trim() || key,
                mode: allowModeSet.has(mode) ? (mode as HotWorkbenchMenuConfigItem['mode']) : 'latest',
                iconKey: normalizeMenuIconKey(item?.iconKey),
                source: allowSourceSet.has(sourceKey) ? (sourceKey as HotWorkbenchMenuConfigItem['source']) : 'auto',
                presetKey: String(item?.presetKey || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, ''),
                fallbackType: fallbackType === 'tag' ? 'tag' : 'category',
                fallbackId: Number.isInteger(fallbackId) && fallbackId > 0 ? fallbackId : 0,
                categoryId: Number.isInteger(categoryId) && categoryId > 0 ? categoryId : 0,
                tagId: Number.isInteger(tagId) && tagId > 0 ? tagId : 0,
                orderBy: allowOrderBySet.has(orderBy) ? orderBy : 'date',
                order: String(item?.order || 'desc').trim().toLowerCase() === 'asc' ? 'asc' : 'desc',
                period: allowPeriodSet.has(period) ? (period as HotWorkbenchMenuConfigItem['period']) : 'all',
                externalUrl: String(item?.externalUrl || '').trim(),
                subtitle: String(item?.subtitle || '').trim(),
                enabled: item?.enabled !== false,
                sort: Number.isFinite(Number(item?.sort)) ? Number(item.sort) : (index + 1) * 10,
            }
        })
        .filter((item): item is HotWorkbenchMenuConfigItem => Boolean(item))
        .sort((a, b) => a.sort - b.sort)
        .map((item, index) => ({ ...item, sort: (index + 1) * 10 }))
    return normalized.length > 0 ? normalized : JSON.parse(JSON.stringify(defaultConfig.workbenchMenuItems))
}

/**
 * 统一配置结构，防止异常值写入数据库。
 */
const normalizeConfig = (config: any): HotArticlesConfig => {
    const placementsAllowSet = new Set(['nav_quick_entry', 'home_menu', 'footer_link'])
    const placements = Array.isArray(config?.displayPlacements)
        ? config.displayPlacements
              .map((item: any) => String(item || '').trim())
              .filter((item: string) => placementsAllowSet.has(item))
        : []
    const pageSize = Number.parseInt(String(config?.pageSize || defaultConfig.pageSize), 10)
    const defaultCategoryId = Number.parseInt(String(config?.defaultCategoryId || 0), 10)
    const defaultTagId = Number.parseInt(String(config?.defaultTagId || 0), 10)
    const orderByAllowSet = new Set(['date', 'modified', 'id', 'title', 'slug', 'relevance', 'views', 'comment_count'])
    const defaultOrderBy = String(config?.defaultOrderBy || 'date').trim().toLowerCase()
    const sourceModeAllowSet = new Set(['auto', 'uied', 'uied_hot', 'uied_latest', 'wp_v2'])
    const apiSourceMode = String(config?.apiSourceMode || 'auto').trim().toLowerCase()
    return {
        enabled: config?.enabled !== false,
        displayPlacements: placements.length > 0 ? Array.from(new Set(placements)) : ['nav_quick_entry'],
        displayLabel: String(config?.displayLabel || defaultConfig.displayLabel).trim() || defaultConfig.displayLabel,
        displayPath: normalizePath(config?.displayPath),
        displaySort: Number.isFinite(Number(config?.displaySort))
            ? Math.max(1, Math.min(9999, Number(config.displaySort)))
            : defaultConfig.displaySort,
        displayOpenInNewTab: config?.displayOpenInNewTab === true,
        pageKicker: String(config?.pageKicker || defaultConfig.pageKicker).trim() || defaultConfig.pageKicker,
        pageTitle: String(config?.pageTitle || defaultConfig.pageTitle).trim() || defaultConfig.pageTitle,
        pageDescription:
            String(config?.pageDescription || defaultConfig.pageDescription).trim() || defaultConfig.pageDescription,
        pageSize: Number.isInteger(pageSize) ? Math.max(1, Math.min(100, pageSize)) : defaultConfig.pageSize,
        defaultOrderBy: orderByAllowSet.has(defaultOrderBy) ? defaultOrderBy : defaultConfig.defaultOrderBy,
        defaultOrder: String(config?.defaultOrder || 'desc').trim().toLowerCase() === 'asc' ? 'asc' : 'desc',
        defaultCategoryId: Number.isInteger(defaultCategoryId) && defaultCategoryId > 0 ? defaultCategoryId : 0,
        defaultTagId: Number.isInteger(defaultTagId) && defaultTagId > 0 ? defaultTagId : 0,
        apiSourceMode: sourceModeAllowSet.has(apiSourceMode) ? (apiSourceMode as HotArticlesConfig['apiSourceMode']) : 'auto',
        motionEnabled: config?.motionEnabled !== false,
        heroTagline: String(config?.heroTagline || defaultConfig.heroTagline).trim() || defaultConfig.heroTagline,
        linksNewWindow: config?.linksNewWindow !== false,
        filterPresets: normalizeFilterPresets(config?.filterPresets),
        workbenchMenuItems: normalizeWorkbenchMenuItems(config?.workbenchMenuItems),
    }
}

/**
 * 把标准化配置回填到表单。
 */
const applyConfigToForm = (config: HotArticlesConfig) => {
    const next = normalizeConfig(config)
    formData.enabled = next.enabled
    formData.displayPlacements = [ ...next.displayPlacements ]
    formData.displayLabel = next.displayLabel
    formData.displayPath = next.displayPath
    formData.displaySort = next.displaySort
    formData.displayOpenInNewTab = next.displayOpenInNewTab
    formData.pageKicker = next.pageKicker
    formData.pageTitle = next.pageTitle
    formData.pageDescription = next.pageDescription
    formData.pageSize = next.pageSize
    formData.defaultOrderBy = next.defaultOrderBy
    formData.defaultOrder = next.defaultOrder
    formData.defaultCategoryId = next.defaultCategoryId
    formData.defaultTagId = next.defaultTagId
    formData.apiSourceMode = next.apiSourceMode
    formData.motionEnabled = next.motionEnabled
    formData.heroTagline = next.heroTagline
    formData.linksNewWindow = next.linksNewWindow
    formData.filterPresets = next.filterPresets.map((item) => ({ ...item }))
    formData.workbenchMenuItems = next.workbenchMenuItems.map((item) => ({ ...item }))
}

/**
 * 加载热门文章配置。
 */
const loadConfig = async () => {
    loading.value = true
    try {
        const result = await uiedHotArticlesConfigGet()
        applyConfigToForm(result || defaultConfig)
    } catch (error) {
        console.error('加载热门文章配置失败:', error)
        feedback.msgError('加载热门文章配置失败')
    } finally {
        loading.value = false
    }
}

/**
 * 新增筛选项，默认放在末尾。
 */
const handleAddPreset = () => {
    const nextSort = (formData.filterPresets.length + 1) * 10
    formData.filterPresets.push({
        key: `preset_${formData.filterPresets.length + 1}`,
        name: '新筛选项',
        type: 'category',
        id: 0,
        description: '',
        enabled: true,
        sort: nextSort,
    })
}

/**
 * 删除筛选项。
 */
const handleRemovePreset = (index: number) => {
    formData.filterPresets.splice(index, 1)
    formData.filterPresets = formData.filterPresets
        .sort((a, b) => a.sort - b.sort)
        .map((item, idx) => ({ ...item, sort: (idx + 1) * 10 }))
}

/**
 * 新增工作台菜单项，默认放在末尾。
 */
const handleAddWorkbenchMenu = () => {
    const nextSort = (formData.workbenchMenuItems.length + 1) * 10
    formData.workbenchMenuItems.push({
        key: `menu_${formData.workbenchMenuItems.length + 1}`,
        label: '新菜单',
        mode: 'latest',
        iconKey: 'extra',
        source: 'auto',
        presetKey: '',
        fallbackType: 'category',
        fallbackId: 0,
        categoryId: 0,
        tagId: 0,
        orderBy: 'date',
        order: 'desc',
        period: 'all',
        externalUrl: '',
        subtitle: '',
        enabled: true,
        sort: nextSort,
    })
}

/**
 * 删除工作台菜单项并重排 sort。
 */
const handleRemoveWorkbenchMenu = (index: number) => {
    formData.workbenchMenuItems.splice(index, 1)
    formData.workbenchMenuItems = formData.workbenchMenuItems
        .sort((a, b) => a.sort - b.sort)
        .map((item, idx) => ({ ...item, sort: (idx + 1) * 10 }))
}

/**
 * 保存热门文章配置。
 */
const handleSave = async () => {
    saving.value = true
    try {
        const payload = normalizeConfig(formData)
        await uiedHotArticlesConfigSave(payload)
        applyConfigToForm(payload)
        feedback.msgSuccess('热门文章配置保存成功')
    } catch (error) {
        console.error('保存热门文章配置失败:', error)
        feedback.msgError('保存热门文章配置失败')
    } finally {
        saving.value = false
    }
}

onMounted(() => {
    loadConfig()
})
</script>

<style lang="scss" scoped>
.hot-articles-setting {
    padding: 14px;
}

.hot-articles-setting__card {
    border-radius: 14px;
}

.hot-articles-setting__header {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;

    h2 {
        margin: 0;
        font-size: 20px;
        line-height: 1.3;
        color: #111827;
    }

    p {
        margin: 8px 0 0;
        color: #6b7280;
        font-size: 13px;
        line-height: 1.6;
    }
}

.hot-articles-setting__actions {
    display: inline-flex;
    gap: 10px;
    flex-shrink: 0;
}

.hot-articles-setting__form {
    max-width: 980px;
}

.hot-articles-setting__preset-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
    color: #6b7280;
    font-size: 13px;
}

.hot-articles-setting__preset-table {
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    overflow: hidden;
}

.hot-articles-setting__preset-head,
.hot-articles-setting__preset-row {
    display: grid;
    grid-template-columns: 1.2fr 1.2fr 1fr 120px 1.4fr 90px 120px 80px;
    gap: 10px;
    padding: 10px;
    align-items: center;
}

.hot-articles-setting__preset-head {
    background: #f8fafc;
    color: #4b5563;
    font-size: 12px;
    font-weight: 600;
}

.hot-articles-setting__preset-row {
    border-top: 1px solid #eef2f7;
}

.hot-articles-setting__menu-table {
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    overflow: auto;
    margin-top: 8px;
}

.hot-articles-setting__menu-head,
.hot-articles-setting__menu-row {
    min-width: 1840px;
    display: grid;
    grid-template-columns: 1.1fr 1.1fr 1fr 1fr 1fr 1fr 120px 120px 1fr 100px 100px 1.4fr 90px 120px 80px;
    gap: 10px;
    padding: 10px;
    align-items: center;
}

.hot-articles-setting__menu-head {
    background: #f8fafc;
    color: #4b5563;
    font-size: 12px;
    font-weight: 600;
}

.hot-articles-setting__menu-row {
    border-top: 1px solid #eef2f7;
}
</style>
