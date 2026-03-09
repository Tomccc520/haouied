<!--
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-02-21
-->
<template>
    <div class="uied-topic-factory-page">
        <el-card class="!border-none mb-4" shadow="never">
            <template #header>
                <div class="flex items-center justify-between">
                    <span class="font-medium">专题页模板工厂</span>
                    <div class="flex gap-2">
                        <el-button @click="handleImportTrigger" :loading="importing">导入模板包</el-button>
                        <el-button @click="handleExportTemplates" :disabled="!templateRows.length"
                            >导出模板包</el-button
                        >
                        <el-button type="primary" @click="handleAddTemplate">新增模板</el-button>
                        <el-button @click="loadTemplates" :loading="loading">刷新</el-button>
                    </div>
                </div>
            </template>
            <el-alert
                title="可一键复制模板创建专题页：AI工具大全 / 设计工具大全 / 跨境工具大全"
                type="info"
                :closable="false"
                class="mb-4"
            />
            <el-table :data="templateRows" v-loading="loading" size="small">
                <el-table-column prop="templateKey" label="模板键" min-width="160" />
                <el-table-column label="模板名称" min-width="140">
                    <template #default="{ row }">
                        <el-input v-model="row.templateName" />
                    </template>
                </el-table-column>
                <el-table-column label="场景" width="140">
                    <template #default="{ row }">
                        <el-input v-model="row.scene" />
                    </template>
                </el-table-column>
                <el-table-column label="描述" min-width="220">
                    <template #default="{ row }">
                        <el-input v-model="row.description" />
                    </template>
                </el-table-column>
                <el-table-column label="默认slug" width="160">
                    <template #default="{ row }">
                        <el-input v-model="row.defaultSlug" />
                    </template>
                </el-table-column>
                <el-table-column label="分类Slug" min-width="220">
                    <template #default="{ row }">
                        <el-input
                            v-model="row.categorySlugsText"
                            type="textarea"
                            :rows="2"
                            placeholder="逗号分隔，例如 ai-xiezuo,ai-kaifa"
                        />
                    </template>
                </el-table-column>
                <el-table-column label="启用" width="90">
                    <template #default="{ row }">
                        <el-switch v-model="row.isEnabled" />
                    </template>
                </el-table-column>
                <el-table-column label="排序" width="100">
                    <template #default="{ row }">
                        <el-input-number
                            v-model="row.sort"
                            :min="1"
                            :max="100000"
                            class="!w-full"
                        />
                    </template>
                </el-table-column>
                <el-table-column label="操作" width="320" fixed="right">
                    <template #default="{ row }">
                        <div class="flex gap-2">
                            <el-button link type="warning" @click="openConfigDialog(row)"
                                >配置</el-button
                            >
                            <el-button link type="info" @click="handleCloneTemplate(row)"
                                >克隆</el-button
                            >
                            <el-button link type="primary" @click="handleSaveTemplate(row)"
                                >保存</el-button
                            >
                            <el-button link type="success" @click="openCreateDialog(row)"
                                >一键创建</el-button
                            >
                            <el-button
                                link
                                type="danger"
                                :disabled="isBuiltinTemplate(row.templateKey)"
                                @click="handleDeleteTemplate(row)"
                            >
                                删除
                            </el-button>
                        </div>
                    </template>
                </el-table-column>
            </el-table>
            <input
                ref="importInputRef"
                type="file"
                accept=".json,application/json"
                class="hidden"
                @change="handleImportFileChange"
            />
        </el-card>

        <el-card class="!border-none" shadow="never">
            <template #header>
                <div class="flex items-center justify-between">
                    <span class="font-medium">字段草案（前后端对接）</span>
                    <el-button @click="loadSchema" :loading="schemaLoading">刷新草案</el-button>
                </div>
            </template>
            <pre class="schema-view">{{ schemaText }}</pre>
        </el-card>

        <el-dialog
            v-model="configDialogVisible"
            title="模板页面配置"
            width="760px"
            destroy-on-close
        >
            <el-form :model="templateConfigForm" label-width="130px">
                <el-form-item label="Hero标题">
                    <el-input v-model="templateConfigForm.heroTitle" />
                </el-form-item>
                <el-form-item label="Hero高亮文字">
                    <el-input v-model="templateConfigForm.heroHighlightText" />
                </el-form-item>
                <el-form-item label="Hero副标题">
                    <el-input
                        v-model="templateConfigForm.heroSubtitle"
                        type="textarea"
                        :rows="2"
                    />
                </el-form-item>
                <el-form-item label="搜索占位词">
                    <el-input v-model="templateConfigForm.searchPlaceholder" />
                </el-form-item>
                <el-form-item label="热门搜索标签">
                    <el-input
                        v-model="templateConfigForm.hotSearchTagsText"
                        type="textarea"
                        :rows="2"
                        placeholder="逗号分隔，例如 AI写作,AI生图"
                    />
                </el-form-item>
                <el-form-item label="背景类型">
                    <el-select v-model="templateConfigForm.heroBgType" class="!w-full">
                        <el-option label="默认" value="default" />
                        <el-option label="渐变" value="gradient" />
                        <el-option label="图片" value="image" />
                        <el-option label="纯色" value="color" />
                    </el-select>
                </el-form-item>
                <el-form-item label="背景值">
                    <el-input
                        v-model="templateConfigForm.heroBgValue"
                        placeholder="例如 linear-gradient(...) 或图片 URL"
                    />
                </el-form-item>
                <el-form-item label="专题主题色">
                    <el-input
                        v-model="templateConfigForm.themeColor"
                        placeholder="例如 #7C3AED"
                    />
                </el-form-item>
                <el-form-item label="启用搜索">
                    <el-switch v-model="templateConfigForm.searchEnabled" />
                </el-form-item>
                <el-form-item label="显示热门推荐">
                    <el-switch v-model="templateConfigForm.showHotRecommendations" />
                </el-form-item>
                <el-form-item label="显示分类区">
                    <el-switch v-model="templateConfigForm.showCategories" />
                </el-form-item>
                <el-form-item label="显示侧边栏">
                    <el-switch v-model="templateConfigForm.showSidebar" />
                </el-form-item>
                <el-form-item label="扩展JSON">
                    <el-input
                        v-model="templateConfigForm.rawJson"
                        type="textarea"
                        :rows="8"
                        placeholder="可选：填写 JSON 覆盖以上字段"
                    />
                </el-form-item>
            </el-form>

            <template #footer>
                <div class="flex justify-end gap-2">
                    <el-button @click="configDialogVisible = false">取消</el-button>
                    <el-button type="primary" @click="handleSaveTemplateConfig">保存配置</el-button>
                </div>
            </template>
        </el-dialog>

        <el-dialog
            v-model="createDialogVisible"
            title="一键创建专题页"
            width="680px"
            destroy-on-close
        >
            <el-form :model="createForm" label-width="120px">
                <el-form-item label="模板键">
                    <el-input v-model="createForm.templateKey" disabled />
                </el-form-item>
                <el-form-item label="专题名称">
                    <el-input v-model="createForm.pageName" placeholder="例如：AI工具大全" />
                </el-form-item>
                <el-form-item label="专题别名">
                    <el-input v-model="createForm.pageSlug" placeholder="例如：ai-tools" />
                </el-form-item>
                <el-form-item label="分类Slug">
                    <el-input
                        v-model="createForm.categorySlugsText"
                        type="textarea"
                        :rows="3"
                        placeholder="逗号分隔，例如 ai-xiezuo,ai-kaifa"
                    />
                </el-form-item>
                <el-form-item label="专题排序">
                    <el-input-number
                        v-model="createForm.sortOrder"
                        :min="0"
                        :max="100000"
                        class="!w-full"
                    />
                </el-form-item>
            </el-form>

            <el-alert
                v-if="previewInfo"
                :title="`预览：匹配分类 ${previewInfo.categoryCount} 个，最终slug：${
                    previewInfo.pageData?.slug || '-'
                }`"
                type="success"
                :closable="false"
                class="mb-3"
            />

            <template #footer>
                <div class="flex justify-end gap-2">
                    <el-button @click="handlePreview">预览</el-button>
                    <el-button type="primary" :loading="creating" @click="handleCreateTopic"
                        >确认创建</el-button
                    >
                </div>
            </template>
        </el-dialog>
    </div>
</template>

<script lang="ts" setup name="uiedTopicFactoryIndex">
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-02-21
 */
import { computed, onMounted, reactive, ref } from 'vue'
import feedback from '@/utils/feedback'
import {
    uiedTopicFactoryCreate,
    uiedTopicFactoryPreview,
    uiedTopicFactorySchema,
    uiedTopicFactoryTemplateDel,
    uiedTopicFactoryTemplateList,
    uiedTopicFactoryTemplateSave
} from '@/api/uied'

interface TopicTemplateRow {
    id?: number
    templateKey: string
    templateName: string
    scene: string
    description: string
    defaultSlug: string
    icon: string
    themeColor?: string
    categorySlugs: string[]
    categorySlugsText: string
    isEnabled: boolean
    sort: number
    pageConfig: Record<string, any>
}

const BUILTIN_KEYS = [
    'ai-tools-directory',
    'design-tools-directory',
    'cross-border-tools-directory'
]

const loading = ref(false)
const schemaLoading = ref(false)
const creating = ref(false)
const importing = ref(false)
const configDialogVisible = ref(false)
const createDialogVisible = ref(false)
const templateRows = ref<TopicTemplateRow[]>([])
const schemaData = ref<Record<string, any>>({})
const previewInfo = ref<any>(null)
const activeConfigTemplateKey = ref('')
const importInputRef = ref<HTMLInputElement | null>(null)

const createForm = reactive({
    templateKey: '',
    pageName: '',
    pageSlug: '',
    categorySlugsText: '',
    sortOrder: 0
})

const templateConfigForm = reactive({
    heroTitle: '',
    heroHighlightText: '',
    heroSubtitle: '',
    searchPlaceholder: '',
    hotSearchTagsText: '',
    heroBgType: 'default',
    heroBgValue: '',
    themeColor: '',
    searchEnabled: true,
    showHotRecommendations: true,
    showCategories: true,
    showSidebar: true,
    rawJson: ''
})

const TOPIC_TEMPLATE_PACKAGE_VERSION = '1.0.0'

/**
 * 判断是否为内置模板
 */
const isBuiltinTemplate = (key: string) => BUILTIN_KEYS.includes(String(key || '').trim())

/**
 * 字段草案展示文本
 */
const schemaText = computed(() => JSON.stringify(schemaData.value || {}, null, 2))

/**
 * 将文本解析为字符串数组（逗号、换行、竖线均可分隔）。
 */
const parseTextList = (value: string) => {
    return String(value || '')
        .split(/[，,\n|]+/)
        .map((item) => item.trim())
        .filter(Boolean)
}

/**
 * 从任意输入值中解析分类 slug 数组。
 */
const parseCategorySlugListFromUnknown = (value: unknown) => {
    if (Array.isArray(value)) {
        return value
            .map((item) => String(item || '').trim())
            .filter(Boolean)
    }
    return parseTextList(String(value || ''))
}

/**
 * 将创建弹窗中的分类文本解析为数组。
 */
const parseCategorySlugs = () => {
    return parseTextList(createForm.categorySlugsText)
}

/**
 * 将模板行数据转换为后端保存参数。
 */
const buildTemplatePayload = (row: TopicTemplateRow) => {
    return {
        id: row.id,
        templateKey: String(row.templateKey || '').trim(),
        templateName: String(row.templateName || '').trim(),
        scene: String(row.scene || '').trim(),
        description: String(row.description || '').trim(),
        defaultSlug: String(row.defaultSlug || '').trim(),
        icon: String(row.icon || '').trim(),
        themeColor: String(row.themeColor || '').trim() || null,
        categorySlugs: parseTextList(row.categorySlugsText || ''),
        isEnabled: row.isEnabled !== false,
        sort: Number(row.sort || 10),
        pageConfig: row.pageConfig || {}
    }
}

/**
 * 规范化导入模板对象，避免字段缺失导致保存失败。
 */
const normalizeImportTemplate = (raw: any, index: number): TopicTemplateRow => {
    const source = raw && typeof raw === 'object' ? raw : {}
    const fallbackKey = `topic-template-import-${Date.now().toString(36)}-${index + 1}`
    const templateKey = String(source.templateKey || source.key || fallbackKey)
        .trim()
        .slice(0, 64)
    const categorySlugs = parseCategorySlugListFromUnknown(
        source.categorySlugs || source.categorySlugsText || ''
    )
    const pageConfig =
        source.pageConfig && typeof source.pageConfig === 'object' ? source.pageConfig : {}
    return {
        id: Number(source.id || 0),
        templateKey,
        templateName: String(source.templateName || source.name || templateKey).trim() || templateKey,
        scene: String(source.scene || 'topic').trim() || 'topic',
        description: String(source.description || '').trim(),
        defaultSlug: String(source.defaultSlug || '').trim(),
        icon: String(source.icon || 'Collection').trim() || 'Collection',
        themeColor: String(source.themeColor || '').trim() || '',
        categorySlugs,
        categorySlugsText: categorySlugs.join(','),
        isEnabled: source.isEnabled !== false,
        sort: Number(source.sort || (index + 1) * 10),
        pageConfig,
    }
}

/**
 * 构建模板导出包结构，便于售卖交付时跨站点导入。
 */
const buildTemplateExportPayload = () => {
    return {
        version: TOPIC_TEMPLATE_PACKAGE_VERSION,
        exportedAt: new Date().toISOString(),
        source: 'uied-topic-factory',
        templates: templateRows.value.map((row) => {
            const payload = buildTemplatePayload(row)
            return {
                ...payload,
                id: undefined,
            }
        }),
    }
}

/**
 * 下载 JSON 文件到本地。
 */
const downloadJsonFile = (filename: string, data: Record<string, any>) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

/**
 * 导出模板包（用于售卖交付/多环境迁移）。
 */
const handleExportTemplates = () => {
    if (!templateRows.value.length) {
        feedback.msgError('暂无可导出的模板')
        return
    }
    const now = new Date()
    const dateText = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
        String(now.getHours()).padStart(2, '0'),
        String(now.getMinutes()).padStart(2, '0'),
        String(now.getSeconds()).padStart(2, '0'),
    ].join('')
    const filename = `uied-topic-templates_${dateText}.json`
    downloadJsonFile(filename, buildTemplateExportPayload())
    feedback.msgSuccess(`导出成功，共 ${templateRows.value.length} 个模板`)
}

/**
 * 触发模板包导入文件选择。
 */
const handleImportTrigger = () => {
    if (!importInputRef.value) return
    importInputRef.value.value = ''
    importInputRef.value.click()
}

/**
 * 处理模板包导入并批量写入后台。
 */
const handleImportFileChange = async (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target?.files?.[0]
    if (!file) return
    importing.value = true
    try {
        const text = await file.text()
        const parsed = JSON.parse(text)
        const templateList: unknown[] = Array.isArray(parsed)
            ? parsed
            : (Array.isArray(parsed?.templates) ? parsed.templates : [])
        if (!templateList.length) {
            feedback.msgError('导入失败：模板包中没有可用模板')
            return
        }

        const normalizedList = templateList
            .map((item: unknown, index: number) => normalizeImportTemplate(item, index))
            .filter(
                (item: TopicTemplateRow) =>
                    String(item.templateKey || '').trim() && String(item.templateName || '').trim()
            )

        if (!normalizedList.length) {
            feedback.msgError('导入失败：模板键或模板名称为空')
            return
        }

        let successCount = 0
        for (const item of normalizedList) {
            const payload = buildTemplatePayload(item)
            await uiedTopicFactoryTemplateSave({
                ...payload,
                id: undefined,
            })
            successCount += 1
        }

        await Promise.all([loadTemplates(), loadSchema()])
        feedback.msgSuccess(`导入成功：共写入 ${successCount} 个模板`)
    } catch (error: any) {
        feedback.msgError(`导入失败：${error?.message || '请检查 JSON 格式'}`)
    } finally {
        importing.value = false
        if (target) {
            target.value = ''
        }
    }
}

/**
 * 加载模板列表
 */
const loadTemplates = async () => {
    loading.value = true
    try {
        const data = await uiedTopicFactoryTemplateList({ includeDisabled: 1 })
        const list = Array.isArray(data?.list) ? data.list : []
        templateRows.value = list.map((item: any) => ({
            id: item.id,
            templateKey: String(item.templateKey || ''),
            templateName: String(item.templateName || ''),
            scene: String(item.scene || ''),
            description: String(item.description || ''),
            defaultSlug: String(item.defaultSlug || ''),
            icon: String(item.icon || ''),
            themeColor: item.themeColor,
            categorySlugs: Array.isArray(item.categorySlugs) ? item.categorySlugs : [],
            categorySlugsText: (Array.isArray(item.categorySlugs) ? item.categorySlugs : []).join(','),
            isEnabled: item.isEnabled !== false,
            sort: Number(item.sort || 10),
            pageConfig:
                item.pageConfig && typeof item.pageConfig === 'object' ? item.pageConfig : {}
        }))
    } finally {
        loading.value = false
    }
}

/**
 * 加载字段草案
 */
const loadSchema = async () => {
    schemaLoading.value = true
    try {
        const data = await uiedTopicFactorySchema()
        schemaData.value = data || {}
    } finally {
        schemaLoading.value = false
    }
}

/**
 * 保存模板
 */
const handleSaveTemplate = async (row: TopicTemplateRow) => {
    const payload = buildTemplatePayload(row)
    if (!payload.templateKey) {
        feedback.msgError('模板键不能为空')
        return
    }
    if (!payload.templateName) {
        feedback.msgError('模板名称不能为空')
        return
    }
    row.categorySlugs = payload.categorySlugs
    row.categorySlugsText = payload.categorySlugs.join(',')
    await uiedTopicFactoryTemplateSave(payload)
    feedback.msgSuccess('模板保存成功')
    await loadTemplates()
}

/**
 * 删除模板
 */
const handleDeleteTemplate = async (row: TopicTemplateRow) => {
    if (!Number(row.id || 0)) {
        templateRows.value = templateRows.value.filter(
            (item) => String(item.templateKey || '') !== String(row.templateKey || '')
        )
        feedback.msgSuccess('未保存模板已移除')
        return
    }
    await feedback.confirm(`确定删除模板：${row.templateName}？`)
    await uiedTopicFactoryTemplateDel({ id: row.id })
    feedback.msgSuccess('删除成功')
    await loadTemplates()
}

/**
 * 新增空白模板（用于快速搭建售卖专题页）。
 */
const handleAddTemplate = () => {
    const nextSort =
        templateRows.value.length > 0
            ? Math.max(...templateRows.value.map((item) => Number(item.sort || 0))) + 10
            : 10
    const nowKey = Date.now().toString(36)
    templateRows.value.unshift({
        id: 0,
        templateKey: `topic-template-${nowKey}`,
        templateName: '新专题模板',
        scene: 'topic',
        description: '',
        defaultSlug: '',
        icon: 'Collection',
        themeColor: '#1677ff',
        categorySlugs: [],
        categorySlugsText: '',
        isEnabled: true,
        sort: nextSort,
        pageConfig: {
            type: 'topic',
            searchEnabled: true,
            showHotRecommendations: true,
            showCategories: true,
            showSidebar: true
        }
    })
}

/**
 * 克隆现有模板，生成一个可独立编辑的副本。
 */
const handleCloneTemplate = async (row: TopicTemplateRow) => {
    const suffix = Date.now().toString(36).slice(-4)
    const nextKey = `${String(row.templateKey || 'topic-template')}-copy-${suffix}`.slice(0, 64)
    await uiedTopicFactoryTemplateSave({
        ...buildTemplatePayload(row),
        id: undefined,
        templateKey: nextKey,
        templateName: `${String(row.templateName || '专题模板')}（副本）`,
        sort: Number(row.sort || 10) + 1
    })
    feedback.msgSuccess('模板克隆成功')
    await loadTemplates()
}

/**
 * 打开模板配置弹窗并回填当前配置。
 */
const openConfigDialog = (row: TopicTemplateRow) => {
    activeConfigTemplateKey.value = String(row.templateKey || '')
    const pageConfig = row.pageConfig && typeof row.pageConfig === 'object' ? row.pageConfig : {}
    templateConfigForm.heroTitle = String(pageConfig.heroTitle || '')
    templateConfigForm.heroHighlightText = String(pageConfig.heroHighlightText || '')
    templateConfigForm.heroSubtitle = String(pageConfig.heroSubtitle || '')
    templateConfigForm.searchPlaceholder = String(pageConfig.searchPlaceholder || '')
    templateConfigForm.hotSearchTagsText = Array.isArray(pageConfig.hotSearchTags)
        ? pageConfig.hotSearchTags.join(',')
        : ''
    templateConfigForm.heroBgType = String(pageConfig.heroBgType || 'default') || 'default'
    templateConfigForm.heroBgValue = String(pageConfig.heroBgValue || '')
    templateConfigForm.themeColor = String(row.themeColor || pageConfig.themeColor || '')
    templateConfigForm.searchEnabled = pageConfig.searchEnabled !== false
    templateConfigForm.showHotRecommendations = pageConfig.showHotRecommendations !== false
    templateConfigForm.showCategories = pageConfig.showCategories !== false
    templateConfigForm.showSidebar = pageConfig.showSidebar !== false
    templateConfigForm.rawJson = JSON.stringify(pageConfig || {}, null, 2)
    configDialogVisible.value = true
}

/**
 * 保存模板配置弹窗数据。
 */
const handleSaveTemplateConfig = async () => {
    const row = templateRows.value.find(
        (item) => String(item.templateKey || '') === activeConfigTemplateKey.value
    )
    if (!row) {
        feedback.msgError('未找到当前模板，请刷新后重试')
        return
    }

    let rawConfig: Record<string, any> = {}
    if (String(templateConfigForm.rawJson || '').trim()) {
        try {
            rawConfig = JSON.parse(templateConfigForm.rawJson)
        } catch (error) {
            feedback.msgError('扩展JSON格式不正确，请检查后重试')
            return
        }
    }

    row.pageConfig = {
        ...rawConfig,
        heroTitle: templateConfigForm.heroTitle,
        heroHighlightText: templateConfigForm.heroHighlightText,
        heroSubtitle: templateConfigForm.heroSubtitle,
        searchPlaceholder: templateConfigForm.searchPlaceholder,
        hotSearchTags: parseTextList(templateConfigForm.hotSearchTagsText),
        heroBgType: templateConfigForm.heroBgType || 'default',
        heroBgValue: templateConfigForm.heroBgValue,
        searchEnabled: templateConfigForm.searchEnabled !== false,
        showHotRecommendations: templateConfigForm.showHotRecommendations !== false,
        showCategories: templateConfigForm.showCategories !== false,
        showSidebar: templateConfigForm.showSidebar !== false,
        themeColor: templateConfigForm.themeColor
    }
    row.themeColor = templateConfigForm.themeColor || row.themeColor
    await handleSaveTemplate(row)
    configDialogVisible.value = false
}

/**
 * 打开创建弹窗
 */
const openCreateDialog = (row: TopicTemplateRow) => {
    createForm.templateKey = row.templateKey
    createForm.pageName = row.templateName
    createForm.pageSlug = row.defaultSlug
    createForm.categorySlugsText = String(row.categorySlugsText || '')
    createForm.sortOrder = Number(row.sort || 0)
    previewInfo.value = null
    createDialogVisible.value = true
}

/**
 * 预览创建结果
 */
const handlePreview = async () => {
    if (!createForm.templateKey || !createForm.pageName) {
        feedback.msgError('请先填写模板键和专题名称')
        return
    }
    const data = await uiedTopicFactoryPreview({
        templateKey: createForm.templateKey,
        pageName: createForm.pageName,
        pageSlug: createForm.pageSlug,
        categorySlugs: parseCategorySlugs(),
        sortOrder: Number(createForm.sortOrder || 0)
    })
    previewInfo.value = data
}

/**
 * 一键创建专题页
 */
const handleCreateTopic = async () => {
    if (!createForm.templateKey || !createForm.pageName) {
        feedback.msgError('请先填写模板键和专题名称')
        return
    }
    creating.value = true
    try {
        const data = await uiedTopicFactoryCreate({
            templateKey: createForm.templateKey,
            pageName: createForm.pageName,
            pageSlug: createForm.pageSlug,
            categorySlugs: parseCategorySlugs(),
            sortOrder: Number(createForm.sortOrder || 0)
        })
        const pagePath = `/p/${data?.pageSlug || ''}`
        feedback.msgSuccess(
            `创建成功：${data?.pageName || ''}（${data?.pageSlug || ''}），前台路径 ${pagePath}`
        )
        createDialogVisible.value = false
        await loadTemplates()
    } finally {
        creating.value = false
    }
}

onMounted(async () => {
    await Promise.all([loadTemplates(), loadSchema()])
})
</script>

<style scoped>
.uied-topic-factory-page {
    display: flex;
    flex-direction: column;
}

.schema-view {
    margin: 0;
    padding: 12px;
    background: #f7f8fa;
    border-radius: 8px;
    max-height: 380px;
    overflow: auto;
    font-size: 12px;
    line-height: 1.6;
}
</style>
