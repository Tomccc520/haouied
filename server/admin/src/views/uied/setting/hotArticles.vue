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

                <el-tabs v-model="activeSectionTab" class="hot-articles-setting__section-tabs">
                <el-tab-pane label="基础参数" name="basic">
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

                <el-divider content-position="left">/p/hot 头部配置</el-divider>

                <el-form-item label="头部角标">
                    <el-input
                        v-model="formData.hubHeaderKicker"
                        :disabled="!formData.enabled"
                        placeholder="CONTENT HUB"
                    />
                </el-form-item>
                <el-form-item label="头部标题">
                    <el-input
                        v-model="formData.hubHeaderTitle"
                        :disabled="!formData.enabled"
                        placeholder="内容中心"
                    />
                </el-form-item>
                <el-form-item label="头部描述">
                    <el-input
                        v-model="formData.hubHeaderDescription"
                        type="textarea"
                        :rows="2"
                        :disabled="!formData.enabled"
                        placeholder="热门文章、热门榜单、每日热榜、最新上新统一在一个页面内切换。"
                    />
                </el-form-item>

                <el-divider content-position="left">运营参数</el-divider>

                <el-form-item label="每页条数">
                    <el-input-number v-model="formData.pageSize" :min="1" :max="100" :disabled="!formData.enabled" />
                </el-form-item>
                <el-form-item label="文章新窗口">
                    <el-switch v-model="formData.linksNewWindow" :disabled="!formData.enabled" />
                </el-form-item>

                </el-tab-pane>
                <el-tab-pane label="筛选预设" name="preset">
                <el-divider content-position="left">筛选预设（迁移 hot 项目）</el-divider>

                <div class="hot-articles-setting__preset-toolbar">
                    <span>可配置顶部筛选项，支持“全部 / 分类 / 标签”三种类型。</span>
                    <div class="hot-articles-setting__toolbar-actions">
                        <el-button size="small" @click="handleImportLegacyPresets">导入旧版标签/分类</el-button>
                        <el-button size="small" type="primary" plain @click="handleAddPreset">新增筛选项</el-button>
                    </div>
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

                </el-tab-pane>
                <el-tab-pane label="左侧菜单" name="menu">
                <el-divider content-position="left">工作台左侧菜单</el-divider>
                <div class="hot-articles-setting__preset-toolbar">
                    <span>仅保留运营高频字段：菜单名、图标、筛选组、外链、启用与排序。</span>
                    <div class="hot-articles-setting__toolbar-actions">
                        <el-button size="small" @click="handleApplyLegacyMenuPresetGroups">一键匹配旧版筛选组</el-button>
                        <el-button size="small" type="primary" plain @click="handleAddWorkbenchMenu">新增菜单项</el-button>
                    </div>
                </div>
                <div class="hot-articles-setting__menu-table">
                    <div class="hot-articles-setting__menu-head" :style="[menuGridStyle, { minWidth: menuMinWidth }]">
                        <span>Key</span>
                        <span>名称</span>
                        <span>模式</span>
                        <span>图标</span>
                        <span>筛选组</span>
                        <span>默认筛选</span>
                        <span>外链</span>
                        <span>启用</span>
                        <span>排序</span>
                        <span>操作</span>
                    </div>
                    <div
                        v-for="(item, index) in formData.workbenchMenuItems"
                        :key="`${item.key}-${index}`"
                        class="hot-articles-setting__menu-row"
                        :style="[menuGridStyle, { minWidth: menuMinWidth }]"
                    >
                        <el-input v-model="item.key" placeholder="key" />
                        <el-input v-model="item.label" placeholder="菜单名称" />
                        <el-select v-model="item.mode" placeholder="模式" @change="() => handleWorkbenchMenuModeChange(item)">
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
                        <el-select
                            v-model="item.presetKeys"
                            multiple
                            filterable
                            allow-create
                            default-first-option
                            collapse-tags
                            collapse-tags-tooltip
                            placeholder="筛选组 key（可多选）"
                            @change="() => handleWorkbenchPresetKeysChange(item)"
                        >
                            <el-option
                                v-for="preset in formData.filterPresets"
                                :key="preset.key"
                                :label="`${preset.name} (${preset.key})`"
                                :value="preset.key"
                            />
                        </el-select>
                        <el-select
                            v-model="item.presetKey"
                            :disabled="item.mode !== 'preset'"
                            placeholder="默认筛选"
                        >
                            <el-option
                                v-for="preset in getPresetOptionsByMenu(item)"
                                :key="`${item.key}-${preset.key}`"
                                :label="`${preset.name} (${preset.key})`"
                                :value="preset.key"
                            />
                        </el-select>
                        <el-input
                            v-model="item.externalUrl"
                            :disabled="item.mode !== 'external'"
                            :placeholder="item.mode === 'external' ? 'https://www.uied.cn' : '仅 external 模式可填写'"
                        />
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
                </el-tab-pane>
                </el-tabs>
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
    hubHeaderKicker: string
    hubHeaderTitle: string
    hubHeaderDescription: string
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
    presetKeys: string[]
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
const activeSectionTab = ref<'basic' | 'preset' | 'menu'>('basic')

/**
 * Hot 旧项目标签/分类库（用于后台一键导入筛选项）。
 * 说明：覆盖 HotArticles + DesignRealtime 常用分类，便于运营直接启用。
 */
const LEGACY_FILTER_PRESET_LIBRARY: HotFilterPreset[] = [
    { key: 'all', name: '全部', type: 'all', id: 0, description: '全部热门文章', enabled: true, sort: 10 },
    { key: 'aigc', name: 'AIGC', type: 'category', id: 417, description: 'AIGC 分类内容', enabled: true, sort: 20 },
    { key: 'ai-tools', name: 'AI工具', type: 'category', id: 3351, description: 'AI 工具分类内容', enabled: true, sort: 30 },
    { key: 'productivity', name: '效率工具', type: 'category', id: 338, description: '效率工具分类内容', enabled: true, sort: 40 },
    { key: 'design', name: '设计干货', type: 'category', id: 307, description: '设计干货分类内容', enabled: true, sort: 50 },
    { key: 'ui', name: 'UI', type: 'category', id: 334, description: 'UI 相关文章', enabled: true, sort: 60 },
    { key: 'ux', name: 'UX', type: 'category', id: 337, description: 'UX 相关文章', enabled: true, sort: 70 },
    { key: 'product', name: '产品', type: 'category', id: 336, description: '产品相关文章', enabled: true, sort: 80 },
    { key: 'graphic', name: '平面', type: 'category', id: 335, description: '平面相关文章', enabled: true, sort: 90 },
    { key: '3d', name: '三维', type: 'category', id: 1031, description: '三维相关文章', enabled: true, sort: 100 },
    { key: 'tips', name: '设计干货专题', type: 'category', id: 307, description: '设计干货专题内容', enabled: true, sort: 110 },
    { key: 'inspiration', name: '设计灵感', type: 'category', id: 1861, description: '设计灵感内容', enabled: true, sort: 120 },
    { key: 'study-circle', name: '学习圈子', type: 'tag', id: 393, description: '学习圈子标签内容', enabled: true, sort: 130 },
    { key: 'nano-banana', name: 'Nano-Banana', type: 'tag', id: 13220, description: 'AI 实时标签', enabled: false, sort: 140 },
    { key: 'midjourney', name: 'Midjourney', type: 'tag', id: 419, description: 'AI 实时标签', enabled: false, sort: 150 },
    { key: 'stable-diffusion', name: 'Stable Diffusion', type: 'tag', id: 428, description: 'AI 实时标签', enabled: false, sort: 160 },
    { key: 'deepseek', name: 'DeepSeek', type: 'tag', id: 3842, description: 'AI 实时标签', enabled: false, sort: 170 },
    { key: 'jimeng', name: '即梦AI', type: 'tag', id: 12110, description: 'AI 实时标签', enabled: false, sort: 180 },
    { key: 'gpt4o', name: 'GPT4o', type: 'tag', id: 4205, description: 'AI 实时标签', enabled: false, sort: 190 },
    { key: 'gpt', name: 'GPT4o', type: 'tag', id: 4205, description: 'AI 实时标签（旧 key 兼容）', enabled: false, sort: 191 },
    { key: 'aixiezuo', name: 'AI写作', type: 'tag', id: 3253, description: 'AI 产品榜单标签', enabled: false, sort: 200 },
    { key: 'aihuihua', name: 'AI绘画', type: 'tag', id: 427, description: 'AI 产品榜单标签', enabled: false, sort: 210 },
    { key: 'aishipin', name: 'AI视频', type: 'tag', id: 3484, description: 'AI 产品榜单标签', enabled: false, sort: 220 },
    { key: 'aibangong', name: 'AI办公', type: 'tag', id: 3485, description: 'AI 产品榜单标签', enabled: false, sort: 230 },
    { key: 'aisheji', name: 'AI设计', type: 'tag', id: 3372, description: 'AI 产品榜单标签', enabled: false, sort: 240 },
    { key: 'aikaifa', name: 'AI开发', type: 'tag', id: 3486, description: 'AI 产品榜单标签', enabled: false, sort: 250 },
    { key: 'aishuziren', name: 'AI数字人', type: 'tag', id: 3487, description: 'AI 产品榜单标签', enabled: false, sort: 260 },
    { key: 'all-resources', name: '全部素材', type: 'category', id: 4, description: '设计素材分类', enabled: false, sort: 269 },
    { key: 'portfolio', name: '作品集', type: 'category', id: 392, description: '设计素材分类', enabled: false, sort: 270 },
    { key: 'card', name: '卡片式', type: 'category', id: 171, description: '设计素材分类', enabled: false, sort: 280 },
    { key: 'big-data', name: '可视化', type: 'category', id: 65, description: '设计素材分类', enabled: false, sort: 290 },
    { key: 'dashboard', name: '后台', type: 'category', id: 67, description: '设计素材分类', enabled: false, sort: 300 },
    { key: 'icon', name: '图标', type: 'category', id: 45, description: '设计素材分类', enabled: false, sort: 310 },
    { key: 'ar', name: '增强现实', type: 'category', id: 791, description: '设计素材分类', enabled: false, sort: 320 },
    { key: 'app', name: '应用', type: 'category', id: 44, description: '设计素材分类', enabled: false, sort: 330 },
    { key: 'watch', name: '手表', type: 'category', id: 66, description: '设计素材分类', enabled: false, sort: 340 },
    { key: 'web', name: '网页', type: 'category', id: 75, description: '设计素材分类', enabled: false, sort: 350 },
    { key: 'design-system', name: '设计系统/组件', type: 'category', id: 261, description: '设计素材分类', enabled: false, sort: 360 },
    { key: '3d-icon', name: '3D/图标', type: 'category', id: 203, description: '设计素材分类', enabled: false, sort: 370 },
    { key: 'font-resource', name: '字体素材', type: 'category', id: 319, description: '设计素材分类', enabled: false, sort: 380 },
    { key: 'font', name: '字体', type: 'category', id: 319, description: '设计素材分类（旧 key 兼容）', enabled: false, sort: 381 },
    { key: 'ps-plugin', name: 'PS插件', type: 'category', id: 11013, description: '设计素材分类', enabled: false, sort: 390 },
    { key: 'sketch-plugin', name: 'Sketch插件', type: 'category', id: 344, description: '设计素材分类', enabled: false, sort: 400 },
    { key: 'mockup', name: '样机', type: 'category', id: 210, description: '设计素材分类', enabled: false, sort: 410 },
]

/**
 * 菜单预设组推荐映射，方便“左侧菜单 -> 顶部筛选组”一键匹配。
 */
const LEGACY_MENU_PRESET_GROUPS: Record<string, string[]> = {
    'latest-articles': ['all', 'aigc', 'ai-tools', 'design'],
    'hot-articles': ['all', 'aigc', 'ai-tools', 'design'],
    'ai-realtime': ['all', 'aigc', 'nano-banana', 'midjourney', 'stable-diffusion', 'deepseek', 'jimeng', 'gpt4o', 'gpt'],
    'ai-products': ['all', 'ai-tools', 'aixiezuo', 'aihuihua', 'aishipin', 'aibangong', 'aisheji', 'aikaifa', 'aishuziren'],
    'design-articles': ['all', 'design', 'ui', 'ux', 'product', 'graphic', '3d', 'tips', 'inspiration'],
    'design-resources': [
        'all',
        'all-resources',
        'portfolio',
        'card',
        'big-data',
        'dashboard',
        'icon',
        'ar',
        'app',
        'watch',
        'web',
        'design-system',
        '3d-icon',
        'font-resource',
        'font',
        'ps-plugin',
        'sketch-plugin',
        'mockup',
    ],
    'top-authors': ['all', 'aigc', 'design'],
    'study-circles': ['all', 'study-circle'],
}

/**
 * 菜单模式的默认图标映射，减少运营同学手工选择成本。
 */
const MENU_MODE_ICON_MAP: Record<HotWorkbenchMenuConfigItem['mode'], HotWorkbenchMenuConfigItem['iconKey']> = {
    latest: 'latest',
    hot: 'hot',
    preset: 'extra',
    authorHot: 'author',
    circle: 'circle',
    external: 'home',
}

/**
 * 菜单表格栅格模板（仅保留运营模式字段）。
 */
const menuGridStyle = {
    gridTemplateColumns: '1.1fr 1.2fr 1fr 1fr 2fr 1.4fr 1.6fr 90px 120px 80px',
}

/**
 * 菜单表格最小宽度，避免列被压缩后操作困难。
 */
const menuMinWidth = '1320px'

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
    hubHeaderKicker: 'CONTENT HUB',
    hubHeaderTitle: '内容中心',
    hubHeaderDescription: '热门文章、热门榜单、每日热榜、最新上新统一在一个页面内切换。',
    linksNewWindow: true,
    filterPresets: [
        { key: 'all', name: '全部', type: 'all', id: 0, description: '全部热门文章', enabled: true, sort: 10 },
        { key: 'aigc', name: 'AIGC', type: 'category', id: 417, description: 'AIGC 分类内容', enabled: true, sort: 20 },
        { key: 'ai-tools', name: 'AI工具', type: 'category', id: 3351, description: 'AI 工具分类内容', enabled: true, sort: 30 },
        { key: 'productivity', name: '效率工具', type: 'category', id: 338, description: '效率工具分类内容', enabled: true, sort: 40 },
        { key: 'design', name: '设计干货', type: 'category', id: 307, description: '设计干货分类内容', enabled: true, sort: 50 },
    ],
    workbenchMenuItems: [
        { key: 'latest-articles', label: '最新文章', mode: 'latest', iconKey: 'latest', source: 'uied_latest', presetKey: '', presetKeys: [], fallbackType: 'category', fallbackId: 0, categoryId: 0, tagId: 0, orderBy: 'date', order: 'desc', period: 'all', externalUrl: '', subtitle: '按发布时间实时更新', enabled: true, sort: 10 },
        { key: 'hot-articles', label: '热门文章', mode: 'hot', iconKey: 'hot', source: 'uied_hot', presetKey: '', presetKeys: [], fallbackType: 'category', fallbackId: 0, categoryId: 417, tagId: 0, orderBy: 'views', order: 'desc', period: 'all', externalUrl: '', subtitle: '按热度优先展示', enabled: true, sort: 20 },
        { key: 'ai-realtime', label: 'AI实时文章', mode: 'preset', iconKey: 'ai', source: 'uied_latest', presetKey: 'aigc', presetKeys: ['all', 'aigc', 'nano-banana', 'midjourney', 'stable-diffusion', 'deepseek', 'jimeng', 'gpt4o', 'gpt'], fallbackType: 'category', fallbackId: 417, categoryId: 0, tagId: 0, orderBy: 'date', order: 'desc', period: 'all', externalUrl: '', subtitle: '', enabled: true, sort: 30 },
        { key: 'ai-products', label: 'AI产品榜单', mode: 'preset', iconKey: 'product', source: 'uied_latest', presetKey: 'ai-tools', presetKeys: ['all', 'ai-tools', 'aixiezuo', 'aihuihua', 'aishipin', 'aibangong', 'aisheji', 'aikaifa', 'aishuziren'], fallbackType: 'category', fallbackId: 3351, categoryId: 0, tagId: 0, orderBy: 'date', order: 'desc', period: 'all', externalUrl: '', subtitle: '', enabled: true, sort: 40 },
        { key: 'design-articles', label: '设计文章', mode: 'preset', iconKey: 'design', source: 'uied_latest', presetKey: 'design', presetKeys: ['all', 'design', 'ui', 'ux', 'product', 'graphic', '3d', 'tips', 'inspiration'], fallbackType: 'category', fallbackId: 307, categoryId: 0, tagId: 0, orderBy: 'date', order: 'desc', period: 'all', externalUrl: '', subtitle: '', enabled: true, sort: 50 },
        { key: 'design-resources', label: '设计素材', mode: 'preset', iconKey: 'resource', source: 'uied_latest', presetKey: 'all-resources', presetKeys: ['all', 'all-resources', 'portfolio', 'card', 'big-data', 'dashboard', 'icon', 'ar', 'app', 'watch', 'web', 'design-system', '3d-icon', 'font-resource', 'font', 'ps-plugin', 'sketch-plugin', 'mockup'], fallbackType: 'category', fallbackId: 4, categoryId: 0, tagId: 0, orderBy: 'date', order: 'desc', period: 'all', externalUrl: '', subtitle: '', enabled: true, sort: 60 },
        { key: 'top-authors', label: '优秀作者', mode: 'authorHot', iconKey: 'author', source: 'uied_hot', presetKey: '', presetKeys: [], fallbackType: 'category', fallbackId: 0, categoryId: 0, tagId: 0, orderBy: 'comment_count', order: 'desc', period: 'weekly', externalUrl: '', subtitle: '', enabled: true, sort: 70 },
        { key: 'study-circles', label: '学习圈子', mode: 'circle', iconKey: 'circle', source: 'uied_latest', presetKey: '', presetKeys: [], fallbackType: 'category', fallbackId: 0, categoryId: 0, tagId: 393, orderBy: 'date', order: 'desc', period: 'all', externalUrl: '', subtitle: '', enabled: true, sort: 80 },
        { key: 'back-main-site', label: '返回主站', mode: 'external', iconKey: 'home', source: 'auto', presetKey: '', presetKeys: [], fallbackType: 'category', fallbackId: 0, categoryId: 0, tagId: 0, orderBy: 'date', order: 'desc', period: 'all', externalUrl: 'https://www.uied.cn', subtitle: '', enabled: true, sort: 999 },
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
const normalizeWorkbenchMenuItems = (
    value: unknown,
    filterPresets: HotFilterPreset[] = []
): HotWorkbenchMenuConfigItem[] => {
    const source = Array.isArray(value) ? value : []
    const usedKeySet = new Set<string>()
    const allowModeSet = new Set(['latest', 'hot', 'preset', 'authorHot', 'circle', 'external'])
    const allowSourceSet = new Set(['auto', 'uied', 'uied_hot', 'uied_latest', 'wp_v2'])
    const allowOrderBySet = new Set(['date', 'modified', 'id', 'title', 'slug', 'relevance', 'views', 'comment_count'])
    const allowPeriodSet = new Set(['all', 'daily', 'weekly', 'monthly'])
    const validPresetKeySet = new Set(
        (Array.isArray(filterPresets) ? filterPresets : [])
            .map((item) => String(item?.key || '').trim().toLowerCase())
            .filter(Boolean)
    )
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
            const presetKey = String(item?.presetKey || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
            const presetKeysRaw = Array.isArray(item?.presetKeys)
                ? item.presetKeys
                : String(item?.presetKeys || '')
                      .split(',')
                      .map((keyText: string) => String(keyText || '').trim())
                      .filter(Boolean)
            const presetKeys = Array.from(
                new Set(
                    [ ...presetKeysRaw, presetKey ]
                        .map((keyText: string) =>
                            String(keyText || '')
                                .trim()
                                .toLowerCase()
                                .replace(/[^a-z0-9_-]/g, '')
                        )
                        .filter(
                            (keyText: string) =>
                                Boolean(keyText) &&
                                (validPresetKeySet.size === 0 || validPresetKeySet.has(keyText))
                        )
                )
            )
            const resolvedPresetKey = presetKeys.includes(presetKey) ? presetKey : (presetKeys[0] || '')
            return {
                key,
                label: String(item?.label || key).trim() || key,
                mode: allowModeSet.has(mode) ? (mode as HotWorkbenchMenuConfigItem['mode']) : 'latest',
                iconKey: normalizeMenuIconKey(item?.iconKey),
                source: allowSourceSet.has(sourceKey) ? (sourceKey as HotWorkbenchMenuConfigItem['source']) : 'auto',
                presetKey: resolvedPresetKey,
                presetKeys,
                fallbackType: fallbackType === 'tag' ? 'tag' : 'category',
                fallbackId: Number.isInteger(fallbackId) && fallbackId > 0 ? fallbackId : 0,
                categoryId: Number.isInteger(categoryId) && categoryId > 0 ? categoryId : 0,
                tagId: Number.isInteger(tagId) && tagId > 0 ? tagId : 0,
                orderBy: allowOrderBySet.has(orderBy) ? orderBy : 'date',
                order: String(item?.order || 'desc').trim().toLowerCase() === 'asc' ? 'asc' : 'desc',
                period: allowPeriodSet.has(period) ? (period as HotWorkbenchMenuConfigItem['period']) : 'all',
                externalUrl: (allowModeSet.has(mode) ? mode : 'latest') === 'external'
                    ? (String(item?.externalUrl || '').trim() || 'https://www.uied.cn')
                    : '',
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
    const normalizedFilterPresets = normalizeFilterPresets(config?.filterPresets)
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
        hubHeaderKicker: String(config?.hubHeaderKicker || defaultConfig.hubHeaderKicker).trim() || defaultConfig.hubHeaderKicker,
        hubHeaderTitle: String(config?.hubHeaderTitle || defaultConfig.hubHeaderTitle).trim() || defaultConfig.hubHeaderTitle,
        hubHeaderDescription: String(config?.hubHeaderDescription || defaultConfig.hubHeaderDescription).trim() || defaultConfig.hubHeaderDescription,
        linksNewWindow: config?.linksNewWindow !== false,
        filterPresets: normalizedFilterPresets,
        workbenchMenuItems: normalizeWorkbenchMenuItems(config?.workbenchMenuItems, normalizedFilterPresets),
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
    formData.hubHeaderKicker = next.hubHeaderKicker
    formData.hubHeaderTitle = next.hubHeaderTitle
    formData.hubHeaderDescription = next.hubHeaderDescription
    formData.linksNewWindow = next.linksNewWindow
    formData.filterPresets = next.filterPresets.map((item) => ({ ...item }))
    formData.workbenchMenuItems = next.workbenchMenuItems.map((item) => ({ ...item }))
    formData.workbenchMenuItems.forEach((item) => {
        handleWorkbenchPresetKeysChange(item)
    })
}

/**
 * 获取当前可用的筛选 key 列表。
 */
const getValidPresetKeys = (): string[] => {
    return formData.filterPresets.map((item) => String(item.key || '').trim().toLowerCase()).filter(Boolean)
}

/**
 * 清洗菜单筛选组 key，自动去重并过滤非法项。
 */
const sanitizeMenuPresetKeys = (value: unknown): string[] => {
    const source = Array.isArray(value)
        ? value
        : String(value || '')
              .split(',')
              .map((item) => String(item || '').trim())
              .filter(Boolean)
    const validKeySet = new Set(getValidPresetKeys())
    const normalized = Array.from(
        new Set(
            source
                .map((item) => String(item || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, ''))
                .filter((item) => Boolean(item) && validKeySet.has(item))
        )
    )
    if (normalized.length > 0 && validKeySet.has('all') && !normalized.includes('all')) {
        return [ 'all', ...normalized ]
    }
    return normalized
}

/**
 * 校正菜单默认筛选项，确保 presetKey 落在 presetKeys 白名单内。
 */
const syncMenuPresetKey = (item: HotWorkbenchMenuConfigItem) => {
    if (!item || item.mode !== 'preset') {
        item.presetKey = ''
        return
    }
    const keys = sanitizeMenuPresetKeys(item.presetKeys)
    item.presetKeys = keys
    if (!keys.length) {
        item.presetKey = ''
        return
    }
    if (!keys.includes(item.presetKey)) {
        const firstBusinessKey = keys.find((key) => key !== 'all')
        item.presetKey = firstBusinessKey || keys[0]
    }
}

/**
 * 获取菜单可选的默认筛选项。
 */
const getPresetOptionsByMenu = (item: HotWorkbenchMenuConfigItem): HotFilterPreset[] => {
    const validKeys = sanitizeMenuPresetKeys(item?.presetKeys)
    if (!validKeys.length) return formData.filterPresets
    const keySet = new Set(validKeys)
    return formData.filterPresets.filter((preset) => keySet.has(preset.key))
}

/**
 * 处理菜单筛选组变更，自动修复默认筛选项。
 */
const handleWorkbenchPresetKeysChange = (item: HotWorkbenchMenuConfigItem) => {
    if (!item) return
    syncMenuPresetKey(item)
}

/**
 * 处理菜单模式变更，自动设置推荐图标和默认参数。
 */
const handleWorkbenchMenuModeChange = (item: HotWorkbenchMenuConfigItem) => {
    if (!item) return
    const mode = item.mode
    const recommendedIcon = MENU_MODE_ICON_MAP[mode]
    if (recommendedIcon && item.iconKey === 'extra') {
        item.iconKey = recommendedIcon
    }
    if (mode === 'external') {
        item.externalUrl = String(item.externalUrl || '').trim() || 'https://www.uied.cn'
        item.presetKey = ''
        item.presetKeys = []
        return
    }
    item.externalUrl = ''
    if (mode !== 'preset') {
        item.presetKey = ''
    } else if (!Array.isArray(item.presetKeys) || item.presetKeys.length === 0) {
        const validKeys = getValidPresetKeys()
        const defaultKeys = [ 'all', validKeys.find((key) => key !== 'all') || '' ].filter(Boolean)
        item.presetKeys = sanitizeMenuPresetKeys(defaultKeys)
    }
    syncMenuPresetKey(item)
}

/**
 * 一键导入旧版 hot 项目筛选库（分类 + 标签）。
 */
const handleImportLegacyPresets = () => {
    const merged = normalizeFilterPresets([ ...formData.filterPresets, ...LEGACY_FILTER_PRESET_LIBRARY ])
    formData.filterPresets = merged.map((item) => ({ ...item }))
    formData.workbenchMenuItems = normalizeWorkbenchMenuItems(formData.workbenchMenuItems, formData.filterPresets).map((item) => ({ ...item }))
    formData.workbenchMenuItems.forEach((item) => {
        handleWorkbenchPresetKeysChange(item)
    })
    feedback.msgSuccess('已导入旧版筛选库，可按需精简后保存')
}

/**
 * 一键按“旧版菜单语义”匹配筛选组，提升运营配置效率。
 */
const handleApplyLegacyMenuPresetGroups = () => {
    const validKeySet = new Set(getValidPresetKeys())
    formData.workbenchMenuItems = formData.workbenchMenuItems.map((item) => {
        const mapping = LEGACY_MENU_PRESET_GROUPS[item.key]
        const fallback = item.mode === 'preset' ? [ 'all', item.presetKey ] : [ 'all' ]
        const target = sanitizeMenuPresetKeys((mapping && mapping.length > 0 ? mapping : fallback).filter(Boolean))
            .filter((key) => validKeySet.has(key))
        const next = {
            ...item,
            presetKeys: target,
        }
        handleWorkbenchPresetKeysChange(next)
        return next
    })
    feedback.msgSuccess('已完成菜单筛选组一键匹配')
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
    formData.workbenchMenuItems.forEach((item) => {
        handleWorkbenchPresetKeysChange(item)
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
    formData.workbenchMenuItems.forEach((item) => {
        handleWorkbenchPresetKeysChange(item)
    })
}

/**
 * 新增工作台菜单项，默认放在末尾。
 */
const handleAddWorkbenchMenu = () => {
    const nextSort = (formData.workbenchMenuItems.length + 1) * 10
    const presetKeys = sanitizeMenuPresetKeys(['all'])
    formData.workbenchMenuItems.push({
        key: `menu_${formData.workbenchMenuItems.length + 1}`,
        label: '新菜单',
        mode: 'latest',
        iconKey: MENU_MODE_ICON_MAP.latest,
        source: 'auto',
        presetKey: '',
        presetKeys,
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

.hot-articles-setting__section-tabs {
    margin-top: 8px;
}

.hot-articles-setting__preset-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
    color: #6b7280;
    font-size: 13px;
    line-height: 1.6;
}

.hot-articles-setting__toolbar-actions {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
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
    display: grid;
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

@media (max-width: 1280px) {
    .hot-articles-setting__preset-toolbar {
        flex-direction: column;
        align-items: flex-start;
    }

    .hot-articles-setting__toolbar-actions {
        width: 100%;
    }
}
</style>
