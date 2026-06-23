<!--
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-21
 */
-->
<template>
    <div class="figma-list-page">
        <el-card class="!border-none" shadow="never">
            <el-form :model="queryParams" :inline="true" class="mb-[-16px]">
                <el-form-item label="关键词">
                    <el-input
                        v-model="queryParams.keyword"
                        class="w-[220px]"
                        placeholder="插件名称/摘要/标识"
                        clearable
                        @keyup.enter="resetPage"
                    />
                </el-form-item>
                <el-form-item label="状态">
                    <el-select
                        v-model="queryParams.status"
                        class="w-[140px]"
                        placeholder="全部状态"
                        clearable
                    >
                        <el-option label="草稿" value="draft" />
                        <el-option label="已发布" value="published" />
                    </el-select>
                </el-form-item>
                <el-form-item label="分类">
                    <el-select
                        v-model="queryParams.categoryId"
                        class="w-[180px]"
                        placeholder="全部分类"
                        clearable
                        filterable
                    >
                        <el-option
                            v-for="item in categoryOptions"
                            :key="item.id"
                            :label="item.name"
                            :value="item.id"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="resetPage">查询</el-button>
                    <el-button @click="resetParams">重置</el-button>
                </el-form-item>
            </el-form>
        </el-card>

        <el-card class="!border-none mt-4" shadow="never">
            <div class="mb-4 flex items-center justify-between flex-wrap gap-3">
                <div class="flex items-center gap-2">
                    <el-button type="primary" @click="handleCreate">
                        <template #icon><icon name="el-icon-Plus" /></template>
                        发布插件
                    </el-button>
                    <el-button @click="handleOpenRecommendPage">
                        <template #icon><icon name="el-icon-Select" /></template>
                        推荐审核
                    </el-button>
                    <el-button @click="openImportDialog">
                        <template #icon><icon name="el-icon-Download" /></template>
                        官方采集
                    </el-button>
                    <el-button :loading="autoTagging" @click="handleAutoTagMissing">
                        <template #icon><icon name="el-icon-CollectionTag" /></template>
                        批量补标签
                    </el-button>
                    <el-button :loading="refreshingStats" @click="handleRefreshMissingStats">
                        <template #icon><icon name="el-icon-DataLine" /></template>
                        补全用户/关注
                    </el-button>
                    <el-button @click="getLists">刷新</el-button>
                </div>
                <div class="figma-list-page__toolbar-right">
                    <div class="figma-list-page__click-config">
                        <span class="figma-list-page__click-config-label">卡片点击</span>
                        <el-radio-group
                            v-model="figmaPageConfig.cardClickAction"
                            size="small"
                            :disabled="figmaPageConfigLoading || figmaPageConfigSaving"
                        >
                            <el-radio-button label="official_first">原链接优先</el-radio-button>
                            <el-radio-button label="detail">进入详情页</el-radio-button>
                        </el-radio-group>
                        <el-switch
                            v-model="figmaPageConfig.cardClickNewWindow"
                            :disabled="
                                figmaPageConfigLoading ||
                                figmaPageConfigSaving ||
                                figmaPageConfig.cardClickAction !== 'official_first'
                            "
                            inline-prompt
                            active-text="新窗"
                            inactive-text="当前页"
                        />
                        <el-button
                            type="primary"
                            size="small"
                            :loading="figmaPageConfigSaving"
                            @click="saveFigmaPageConfig"
                        >
                            保存交互
                        </el-button>
                    </div>
                    <div class="text-xs text-[#6b7280]">共 {{ pager.count }} 个插件</div>
                </div>
            </div>

            <el-table size="large" v-loading="pager.loading" :data="pager.lists">
                <el-table-column label="ID" prop="id" width="80" />
                <el-table-column label="插件名称" min-width="260">
                    <template #default="{ row }">
                        <div class="figma-list-page__title">{{ row.name }}</div>
                        <div class="figma-list-page__sub">
                            /{{ row.slug }}
                            <span class="figma-list-page__path"
                                >前端路径：{{ resolveFrontendFigmaPath(row) }}</span
                            >
                            <a
                                v-if="row.officialUrl"
                                class="figma-list-page__link"
                                :href="row.officialUrl"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                官方链接
                            </a>
                        </div>
                    </template>
                </el-table-column>
                <el-table-column label="分类" min-width="140">
                    <template #default="{ row }">
                        <span>{{ row.categoryName || '-' }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="状态" width="110">
                    <template #default="{ row }">
                        <el-tag :type="row.status === 'published' ? 'success' : 'info'">
                            {{ row.status === 'published' ? '已发布' : '草稿' }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="推荐" width="90">
                    <template #default="{ row }">
                        <el-tag v-if="Number(row.isRecommended) === 1" type="warning" effect="plain"
                            >推荐</el-tag
                        >
                        <span v-else>-</span>
                    </template>
                </el-table-column>
                <el-table-column label="用户量" width="100">
                    <template #default="{ row }">
                        {{ Number(row.userCount || 0).toLocaleString('zh-CN') }}
                    </template>
                </el-table-column>
                <el-table-column label="关注量" width="100">
                    <template #default="{ row }">
                        {{ Number(row.likeCount || 0).toLocaleString('zh-CN') }}
                    </template>
                </el-table-column>
                <el-table-column label="浏览" prop="viewCount" width="90" />
                <el-table-column label="更新时间" min-width="170">
                    <template #default="{ row }">
                        {{ formatUnixTime(row.updateTime || row.publishTime || row.createTime) }}
                    </template>
                </el-table-column>
                <el-table-column label="操作" width="250" fixed="right">
                    <template #default="{ row }">
                        <el-button type="primary" link @click="openFrontendFigma(row)"
                            >查看前端</el-button
                        >
                        <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
                        <el-button type="danger" link @click="handleDelete(row.id)">删除</el-button>
                    </template>
                </el-table-column>
            </el-table>

            <div class="flex justify-end mt-4">
                <pagination v-model="pager" @change="getLists" />
            </div>
        </el-card>

        <el-drawer
            v-model="editDrawerVisible"
            title="编辑 Figma 插件"
            size="560px"
            :close-on-click-modal="false"
            :destroy-on-close="false"
        >
            <div v-loading="editDrawerLoading" class="figma-edit-drawer">
                <el-form
                    ref="editFormRef"
                    :model="editFormData"
                    :rules="editRules"
                    label-width="96px"
                >
                    <el-form-item label="插件名称" prop="name">
                        <el-input v-model="editFormData.name" placeholder="请输入插件名称" />
                    </el-form-item>
                    <el-form-item label="插件标识">
                        <el-input
                            v-model="editFormData.slug"
                            placeholder="用于详情页路径，建议英文短横线"
                        />
                    </el-form-item>
                    <el-form-item label="官方链接" prop="officialUrl">
                        <el-input
                            v-model="editFormData.officialUrl"
                            placeholder="https://www.figma.com/community/plugin/..."
                        />
                    </el-form-item>
                    <el-form-item label="简介">
                        <el-input
                            v-model="editFormData.summary"
                            type="textarea"
                            :rows="3"
                            placeholder="插件简介（用于列表摘要与SEO）"
                        />
                    </el-form-item>
                    <el-form-item label="分类">
                        <el-select
                            v-model="editFormData.categoryId"
                            clearable
                            filterable
                            style="width: 100%"
                            placeholder="请选择分类"
                        >
                            <el-option
                                v-for="item in categoryOptions"
                                :key="item.id"
                                :label="item.name"
                                :value="item.id"
                            />
                        </el-select>
                    </el-form-item>
                    <el-form-item label="标签">
                        <el-select
                            v-model="editFormData.tagIds"
                            multiple
                            collapse-tags
                            collapse-tags-tooltip
                            filterable
                            style="width: 100%"
                            placeholder="请选择标签（可多选）"
                        >
                            <el-option
                                v-for="item in tagOptions"
                                :key="item.id"
                                :label="item.name"
                                :value="item.id"
                            />
                        </el-select>
                    </el-form-item>
                    <el-form-item label="发布状态">
                        <el-radio-group v-model="editFormData.status">
                            <el-radio-button label="published">已发布</el-radio-button>
                            <el-radio-button label="draft">草稿</el-radio-button>
                        </el-radio-group>
                    </el-form-item>
                    <el-form-item label="推荐位">
                        <el-switch
                            :model-value="editFormData.isRecommended === 1"
                            @update:model-value="
                                (value) => (editFormData.isRecommended = value ? 1 : 0)
                            "
                        />
                    </el-form-item>
                    <el-form-item label="排序">
                        <el-input-number v-model="editFormData.sortOrder" :min="0" />
                    </el-form-item>
                    <el-form-item label="用户量">
                        <el-input-number v-model="editFormData.userCount" :min="0" :step="100" />
                    </el-form-item>
                    <el-form-item label="关注量">
                        <el-input-number v-model="editFormData.likeCount" :min="0" :step="100" />
                    </el-form-item>
                    <el-form-item label="SEO标题">
                        <el-input
                            v-model="editFormData.seoTitle"
                            placeholder="为空则使用插件名称"
                        />
                    </el-form-item>
                    <el-form-item label="SEO关键词">
                        <el-input
                            v-model="editFormData.seoKeywords"
                            placeholder="关键词用英文逗号分隔"
                        />
                    </el-form-item>
                    <el-form-item label="SEO描述">
                        <el-input
                            v-model="editFormData.seoDescription"
                            type="textarea"
                            :rows="3"
                            placeholder="建议 60-120 字"
                        />
                    </el-form-item>
                </el-form>
            </div>
            <template #footer>
                <div class="figma-edit-drawer__footer">
                    <el-button @click="openFullPublishEditor">打开完整编辑页</el-button>
                    <el-button @click="editDrawerVisible = false">取消</el-button>
                    <el-button
                        type="primary"
                        :loading="editSubmitting"
                        @click="handleSaveDrawerEdit"
                        >保存</el-button
                    >
                </div>
            </template>
        </el-drawer>

        <el-dialog
            v-model="importDialogVisible"
            title="官方采集 Figma 插件"
            width="680px"
            :close-on-click-modal="false"
        >
            <el-form :model="importForm" label-width="120px">
                <el-form-item label="采集分类">
                    <el-select
                        v-model="importForm.sourceCategory"
                        class="w-[360px]"
                        placeholder="请选择官方分类"
                        @change="handleSourceCategoryChange"
                    >
                        <el-option
                            v-for="item in officialSourceCategoryOptions"
                            :key="item.value"
                            :label="item.label"
                            :value="item.value"
                        />
                    </el-select>
                    <div class="figma-list-page__hint">
                        选择分类后会自动填充来源地址，仅“自定义链接”支持手工输入来源地址。
                    </div>
                </el-form-item>
                <el-form-item label="来源地址">
                    <el-input
                        v-model="importForm.sourceUrl"
                        placeholder="https://www.figma.com/community/plugins"
                        :disabled="importForm.sourceCategory !== 'custom'"
                    />
                    <div class="figma-list-page__hint">
                        仅采集公开元信息（封面/标题/简介）并保留来源链接；若官方页面被风控拦截，将自动降级只读通道继续采集。
                    </div>
                </el-form-item>
                <el-form-item label="采集数量">
                    <el-input-number v-model="importForm.limit" :min="1" :max="120" />
                </el-form-item>
                <el-form-item label="默认分类">
                    <el-select
                        v-model="importForm.categoryId"
                        clearable
                        filterable
                        placeholder="不指定则保持未分类"
                        class="w-[360px]"
                    >
                        <el-option
                            v-for="item in categoryOptions"
                            :key="item.id"
                            :label="item.name"
                            :value="item.id"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item label="来源自动分类">
                    <el-switch v-model="importForm.autoCategory" />
                    <div class="figma-list-page__hint">
                        未指定“默认分类”时，将根据采集分类自动映射本地分类并写入。
                    </div>
                </el-form-item>
                <el-form-item label="导入状态">
                    <el-radio-group v-model="importForm.status">
                        <el-radio-button label="published">直接发布</el-radio-button>
                        <el-radio-button label="draft">导入草稿</el-radio-button>
                    </el-radio-group>
                </el-form-item>
                <el-form-item label="标题简介汉化">
                    <el-switch v-model="importForm.translate" />
                    <div class="figma-list-page__hint">
                        开启后会调用 AI 配置进行汉化，若失败自动保留原文。
                    </div>
                </el-form-item>
                <el-form-item label="导入结果" v-if="importResultText">
                    <div class="figma-list-page__import-result">{{ importResultText }}</div>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="importDialogVisible = false">关闭</el-button>
                <el-button type="primary" :loading="importing" @click="handleImportOfficial"
                    >开始采集</el-button
                >
            </template>
        </el-dialog>
    </div>
</template>

<script lang="ts" setup name="uiedFigmaIndex">
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-21
 */
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import feedback from '@/utils/feedback'
import { usePaging } from '@/hooks/usePaging'
import {
    uiedFigmaList,
    uiedFigmaDetail,
    uiedFigmaEdit,
    uiedFigmaDelete,
    uiedFigmaCategoryAll,
    uiedFigmaTagAll,
    uiedFigmaTagAutoFill,
    uiedFigmaRefreshMissingStats,
    uiedFigmaImportOfficial,
    uiedSettingGet,
    uiedSettingSave
} from '@/api/uied'

interface FigmaCategoryOption {
    id: number
    name: string
}

interface FigmaTagOption {
    id: number
    name: string
}

interface FigmaEditFormState {
    id: number
    name: string
    slug: string
    summary: string
    content: string
    iconUrl: string
    coverUrl: string
    officialUrl: string
    docsUrl: string
    githubUrl: string
    figmaPluginId: string
    authorName: string
    sourceType: string
    sourceUrl: string
    transportType: string
    runtime: string
    protocolVersion: string
    categoryId?: number
    tagIds: number[]
    status: 'draft' | 'published'
    isRecommended: number
    sortOrder: number
    userCount: number
    likeCount: number
    seoTitle: string
    seoKeywords: string
    seoDescription: string
}

interface FigmaImportResult {
    sourceUrl: string
    scanned: number
    created: number
    updated: number
    failed: number
}

interface FigmaPageConfigState {
    enabled: boolean
    listPageSize: number
    cardClickAction: 'detail' | 'official_first'
    cardClickNewWindow: boolean
}

const router = useRouter()

const queryParams = reactive({
    keyword: '',
    status: '',
    categoryId: '' as number | string
})

const categoryOptions = ref<FigmaCategoryOption[]>([])
const tagOptions = ref<FigmaTagOption[]>([])
const importDialogVisible = ref(false)
const importing = ref(false)
const autoTagging = ref(false)
const refreshingStats = ref(false)
const editDrawerVisible = ref(false)
const editDrawerLoading = ref(false)
const editSubmitting = ref(false)
const importResultText = ref('')
const figmaPageConfigLoading = ref(false)
const figmaPageConfigSaving = ref(false)
const officialSourceCategoryOptions = [
    { label: '全部插件', value: 'plugins', url: 'https://www.figma.com/community/plugins' },
    {
        label: '编辑效果',
        value: 'editing-effects',
        url: 'https://www.figma.com/community/editing-effects?resource_type=plugins'
    },
    {
        label: '开发协作',
        value: 'development',
        url: 'https://www.figma.com/community/development?resource_type=plugins'
    },
    {
        label: '导入导出',
        value: 'import-export',
        url: 'https://www.figma.com/community/import-export?resource_type=plugins'
    },
    {
        label: '文件组织',
        value: 'file-organization',
        url: 'https://www.figma.com/community/file-organization?resource_type=plugins'
    },
    {
        label: '无障碍',
        value: 'accessibility',
        url: 'https://www.figma.com/community/accessibility?resource_type=plugins'
    },
    { label: '自定义链接', value: 'custom', url: '' }
]
const importForm = reactive({
    sourceUrl: 'https://www.figma.com/community/plugins',
    sourceCategory: 'plugins',
    limit: 20,
    categoryId: undefined as number | undefined,
    autoCategory: true,
    status: 'published' as 'draft' | 'published',
    translate: true
})

const figmaPageConfig = reactive<FigmaPageConfigState>({
    enabled: true,
    listPageSize: 24,
    cardClickAction: 'official_first',
    cardClickNewWindow: true
})

const DEFAULT_EDIT_FORM: FigmaEditFormState = {
    id: 0,
    name: '',
    slug: '',
    summary: '',
    content: '',
    iconUrl: '',
    coverUrl: '',
    officialUrl: '',
    docsUrl: '',
    githubUrl: '',
    figmaPluginId: '',
    authorName: '',
    sourceType: '',
    sourceUrl: '',
    transportType: 'http',
    runtime: 'other',
    protocolVersion: '',
    categoryId: undefined,
    tagIds: [],
    status: 'draft',
    isRecommended: 0,
    sortOrder: 0,
    userCount: 0,
    likeCount: 0,
    seoTitle: '',
    seoKeywords: '',
    seoDescription: ''
}

const editFormRef = ref<FormInstance>()
const editFormData = reactive<FigmaEditFormState>({ ...DEFAULT_EDIT_FORM })
const editRules: FormRules = {
    name: [{ required: true, message: '插件名称不能为空', trigger: 'blur' }],
    officialUrl: [{ required: true, message: '官方链接不能为空', trigger: 'blur' }]
}

const { pager, getLists, resetPage, resetParams } = usePaging({
    fetchFun: uiedFigmaList,
    params: queryParams
})

/**
 * 规范化 Figma 前端配置，确保后台保存前字段稳定。
 */
const normalizeFigmaPageConfig = (data: any): FigmaPageConfigState => {
    const cardClickAction = String(data?.cardClickAction || '')
        .trim()
        .toLowerCase()
    return {
        enabled: data?.enabled !== false,
        listPageSize: Number.isFinite(Number(data?.listPageSize))
            ? Math.max(6, Math.min(72, Number(data.listPageSize)))
            : 24,
        cardClickAction: cardClickAction === 'detail' ? 'detail' : 'official_first',
        cardClickNewWindow: data?.cardClickNewWindow !== false
    }
}

/**
 * 加载 Figma 前端卡片点击配置，便于在 Figma 管理页直接调整交互。
 */
const loadFigmaPageConfig = async () => {
    figmaPageConfigLoading.value = true
    try {
        const data = await uiedSettingGet({ key: 'figmaPageConfig' })
        const config = normalizeFigmaPageConfig(data && typeof data === 'object' ? data : {})
        figmaPageConfig.enabled = config.enabled
        figmaPageConfig.listPageSize = config.listPageSize
        figmaPageConfig.cardClickAction = config.cardClickAction
        figmaPageConfig.cardClickNewWindow = config.cardClickNewWindow
    } catch (error) {
        console.error('加载Figma页面配置失败:', error)
        feedback.msgError('加载卡片点击配置失败')
    } finally {
        figmaPageConfigLoading.value = false
    }
}

/**
 * 保存 Figma 前端卡片点击配置。
 */
const saveFigmaPageConfig = async () => {
    figmaPageConfigSaving.value = true
    try {
        const payload = normalizeFigmaPageConfig(figmaPageConfig)
        await uiedSettingSave({ figmaPageConfig: payload })
        figmaPageConfig.enabled = payload.enabled
        figmaPageConfig.listPageSize = payload.listPageSize
        figmaPageConfig.cardClickAction = payload.cardClickAction
        figmaPageConfig.cardClickNewWindow = payload.cardClickNewWindow
        feedback.msgSuccess('卡片点击配置保存成功')
    } catch (error) {
        console.error('保存Figma页面配置失败:', error)
        feedback.msgError('保存卡片点击配置失败')
    } finally {
        figmaPageConfigSaving.value = false
    }
}

/**
 * 加载分类选项，用于列表筛选与采集默认分类选择。
 */
const loadCategoryOptions = async () => {
    const rows = await uiedFigmaCategoryAll({})
    categoryOptions.value = (Array.isArray(rows) ? rows : [])
        .map((item: any) => ({
            id: Number(item.id || 0),
            name: String(item.name || '')
        }))
        .filter((item) => item.id > 0 && item.name)
}

/**
 * 加载标签选项，用于侧边编辑弹窗的标签多选。
 */
const loadTagOptions = async () => {
    const rows = await uiedFigmaTagAll({})
    tagOptions.value = (Array.isArray(rows) ? rows : [])
        .map((item: any) => ({
            id: Number(item.id || 0),
            name: String(item.name || '')
        }))
        .filter((item) => item.id > 0 && item.name)
}

/**
 * 重置侧边编辑弹窗表单，避免脏数据串页。
 */
const resetEditFormData = () => {
    Object.assign(editFormData, { ...DEFAULT_EDIT_FORM })
}

/**
 * 跳转到发布页面创建新插件。
 */
const handleCreate = () => {
    router.push('/figma-center/figma-publish')
}

/**
 * 跳转到 Figma 推荐审核页。
 */
const handleOpenRecommendPage = () => {
    router.push('/figma-center/figma-recommend')
}

/**
 * 跳转到发布页面编辑插件。
 */
const handleEdit = (row: any) => {
    const id = Number(row?.id || 0)
    if (!id) return
    resetEditFormData()
    editDrawerVisible.value = true
    editDrawerLoading.value = true
    uiedFigmaDetail({ id })
        .then((detail: any) => {
            const tagsFromDetail = Array.isArray(detail?.tags)
                ? detail.tags
                      .map((item: any) => Number(item?.id || 0))
                      .filter((item: number) => item > 0)
                : []
            const tagIds =
                tagsFromDetail.length > 0
                    ? tagsFromDetail
                    : Array.isArray(detail?.tagIds)
                    ? detail.tagIds
                          .map((item: any) => Number(item || 0))
                          .filter((item: number) => item > 0)
                    : []
            Object.assign(editFormData, {
                id: Number(detail?.id || id),
                name: String(detail?.name || ''),
                slug: String(detail?.slug || ''),
                summary: String(detail?.summary || ''),
                content: String(detail?.content || detail?.summary || ''),
                iconUrl: String(detail?.iconUrl || ''),
                coverUrl: String(detail?.coverUrl || ''),
                officialUrl: String(detail?.officialUrl || ''),
                docsUrl: String(detail?.docsUrl || ''),
                githubUrl: String(detail?.githubUrl || ''),
                figmaPluginId: String(detail?.figmaPluginId || ''),
                authorName: String(detail?.authorName || ''),
                sourceType: String(detail?.sourceType || ''),
                sourceUrl: String(detail?.sourceUrl || ''),
                transportType: String(detail?.transportType || 'http'),
                runtime: String(detail?.runtime || 'other'),
                protocolVersion: String(detail?.protocolVersion || ''),
                categoryId: Number(detail?.categoryId || 0) || undefined,
                tagIds,
                status:
                    String(detail?.status || '').toLowerCase() === 'published'
                        ? 'published'
                        : 'draft',
                isRecommended: Number(detail?.isRecommended || 0) === 1 ? 1 : 0,
                sortOrder: Number(detail?.sortOrder || 0),
                userCount: Number(detail?.userCount || 0),
                likeCount: Number(detail?.likeCount || 0),
                seoTitle: String(detail?.seoTitle || ''),
                seoKeywords: String(detail?.seoKeywords || ''),
                seoDescription: String(detail?.seoDescription || '')
            } as FigmaEditFormState)
        })
        .catch((error: any) => {
            editDrawerVisible.value = false
            feedback.msgError(
                error?.msg || error?.message || error?.response?.data?.message || '加载插件详情失败'
            )
        })
        .finally(() => {
            editDrawerLoading.value = false
        })
}

/**
 * 计算前台预览基地址：本地环境默认使用 3003，线上环境沿用当前域名。
 */
const getFrontendPreviewBaseUrl = (): string => {
    const { protocol, hostname, origin } = window.location
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return `${protocol}//${hostname}:3003`
    }
    return origin
}

/**
 * 解析 Figma 插件在前端的筛选路径，便于运营快速定位。
 */
const resolveFrontendFigmaPath = (row: any): string => {
    const keyword = String(row?.slug || row?.name || '').trim()
    if (!keyword) return '/figma'
    return `/figma?q=${encodeURIComponent(keyword)}`
}

/**
 * 在新窗口打开插件对应的前端页。
 */
const openFrontendFigma = (row: any) => {
    const targetPath = resolveFrontendFigmaPath(row)
    window.open(`${getFrontendPreviewBaseUrl()}${targetPath}`, '_blank')
}

/**
 * 删除插件条目。
 */
const handleDelete = async (id: number) => {
    const targetId = Number(id || 0)
    if (!targetId) return
    await feedback.confirm('确定删除该 Figma 插件吗？删除后前台将不可见。')
    await uiedFigmaDelete({ id: targetId })
    feedback.msgSuccess('删除成功')
    getLists()
}

/**
 * 打开完整发布页（高级字段编辑入口）。
 */
const openFullPublishEditor = () => {
    const id = Number(editFormData.id || 0)
    if (!id) return
    router.push(`/figma-center/figma-publish?id=${id}`)
}

/**
 * 保存侧边弹窗编辑数据。
 */
const handleSaveDrawerEdit = async () => {
    await editFormRef.value?.validate()
    editSubmitting.value = true
    try {
        const payload = {
            id: Number(editFormData.id || 0),
            name: String(editFormData.name || '').trim(),
            slug: String(editFormData.slug || '').trim(),
            summary: String(editFormData.summary || '').trim(),
            content: String(editFormData.content || '').trim(),
            iconUrl: String(editFormData.iconUrl || '').trim(),
            coverUrl: String(editFormData.coverUrl || '').trim(),
            officialUrl: String(editFormData.officialUrl || '').trim(),
            docsUrl: String(editFormData.docsUrl || '').trim(),
            githubUrl: String(editFormData.githubUrl || '').trim(),
            figmaPluginId: String(editFormData.figmaPluginId || '').trim(),
            authorName: String(editFormData.authorName || '').trim(),
            sourceType: String(editFormData.sourceType || '').trim(),
            sourceUrl: String(editFormData.sourceUrl || '').trim(),
            transportType: String(editFormData.transportType || '').trim() || 'http',
            runtime: String(editFormData.runtime || '').trim() || 'other',
            protocolVersion: String(editFormData.protocolVersion || '').trim(),
            categoryId: Number(editFormData.categoryId || 0) || null,
            tagIds: Array.from(
                new Set(
                    (Array.isArray(editFormData.tagIds) ? editFormData.tagIds : [])
                        .map((item) => Number(item || 0))
                        .filter((item) => item > 0)
                )
            ),
            status: editFormData.status === 'published' ? 'published' : 'draft',
            isRecommended: Number(editFormData.isRecommended || 0) === 1 ? 1 : 0,
            sortOrder: Number(editFormData.sortOrder || 0),
            userCount: Math.max(0, Number(editFormData.userCount || 0)),
            likeCount: Math.max(0, Number(editFormData.likeCount || 0)),
            seoTitle: String(editFormData.seoTitle || '').trim(),
            seoKeywords: String(editFormData.seoKeywords || '').trim(),
            seoDescription: String(editFormData.seoDescription || '').trim()
        }
        await uiedFigmaEdit(payload)
        feedback.msgSuccess('保存成功')
        editDrawerVisible.value = false
        await getLists()
    } catch (error: any) {
        feedback.msgError(
            error?.msg || error?.message || error?.response?.data?.message || '保存失败'
        )
    } finally {
        editSubmitting.value = false
    }
}

/**
 * 打开官方采集弹窗并清空上次结果。
 */
const openImportDialog = () => {
    handleSourceCategoryChange(importForm.sourceCategory)
    importResultText.value = ''
    importDialogVisible.value = true
}

/**
 * 根据官方分类选择同步来源 URL。
 */
const handleSourceCategoryChange = (value?: string) => {
    const sourceCategory = String(value || importForm.sourceCategory || '').trim()
    const target = officialSourceCategoryOptions.find((item) => item.value === sourceCategory)
    if (!target) return
    if (target.value === 'custom') return
    importForm.sourceUrl = target.url
}

/**
 * 调用后端采集官方 Figma 插件。
 */
const handleImportOfficial = async () => {
    importing.value = true
    importResultText.value = ''
    try {
        const result = (await uiedFigmaImportOfficial({
            sourceUrl: importForm.sourceUrl,
            sourceCategory: importForm.sourceCategory,
            limit: Number(importForm.limit || 20),
            categoryId: importForm.categoryId || null,
            autoCategory: importForm.autoCategory,
            status: importForm.status,
            translate: importForm.translate
        })) as FigmaImportResult
        importResultText.value = `来源：${result?.sourceUrl || '-'} ｜ 扫描：${Number(
            result?.scanned || 0
        )} ｜ 新增：${Number(result?.created || 0)} ｜ 更新：${Number(
            result?.updated || 0
        )} ｜ 失败：${Number(result?.failed || 0)}`
        feedback.msgSuccess('采集完成')
        await getLists()
    } finally {
        importing.value = false
    }
}

/**
 * 批量补齐无标签插件：按分类与关键词自动映射标签。
 */
const handleAutoTagMissing = async () => {
    await feedback.confirm(
        '将为“没有标签”的 Figma 插件批量补齐标签。已存在标签的插件不会覆盖，是否继续？'
    )
    autoTagging.value = true
    try {
        const batchLimit = 300
        let totalProcessed = 0
        let totalUpdated = 0
        let totalSkipped = 0
        let totalMatchedRelations = 0
        let nextStartId = 0
        let round = 0
        while (round < 30) {
            round += 1
            const result: any = await uiedFigmaTagAutoFill({
                limit: batchLimit,
                onlyWithoutTags: 1,
                startId: nextStartId
            })
            const processed = Number(result?.processed || 0)
            const updated = Number(result?.updated || 0)
            const skipped = Number(result?.skipped || 0)
            const matchedRelations = Number(result?.matchedRelations || 0)
            nextStartId = Number(result?.nextStartId || nextStartId || 0)
            totalProcessed += processed
            totalUpdated += updated
            totalSkipped += skipped
            totalMatchedRelations += matchedRelations
            if (processed <= 0 || processed < batchLimit || !result?.hasMore) {
                break
            }
        }
        if (totalUpdated === 0) {
            nextStartId = 0
            let fullRound = 0
            while (fullRound < 16) {
                fullRound += 1
                const result: any = await uiedFigmaTagAutoFill({
                    limit: 180,
                    onlyWithoutTags: 0,
                    startId: nextStartId
                })
                const processed = Number(result?.processed || 0)
                const updated = Number(result?.updated || 0)
                const skipped = Number(result?.skipped || 0)
                const matchedRelations = Number(result?.matchedRelations || 0)
                nextStartId = Number(result?.nextStartId || nextStartId || 0)
                totalProcessed += processed
                totalUpdated += updated
                totalSkipped += skipped
                totalMatchedRelations += matchedRelations
                if (processed <= 0 || processed < 180 || !result?.hasMore) {
                    break
                }
            }
        }
        feedback.msgSuccess(
            `补标签完成：处理 ${totalProcessed}，更新 ${totalUpdated}，跳过 ${totalSkipped}，标签关系 ${totalMatchedRelations}`
        )
        await getLists()
    } catch (error: any) {
        feedback.msgError(
            error?.msg || error?.message || error?.response?.data?.message || '批量补标签失败'
        )
    } finally {
        autoTagging.value = false
    }
}

/**
 * 批量补全缺失的用户量/关注量统计。
 */
const handleRefreshMissingStats = async () => {
    await feedback.confirm('将批量补全缺失的“用户量/关注量”，仅补空值，不覆盖已有数据，是否继续？')
    refreshingStats.value = true
    try {
        /**
         * 采用分批执行，避免单次抓取过多官方页面导致请求超时。
         */
        const batchLimit = 40
        let totalProcessed = 0
        let totalUpdated = 0
        let totalFailed = 0
        let totalUnchanged = 0
        let nextBeforeId = 0
        let round = 0
        while (round < 24) {
            round += 1
            const result: any = await uiedFigmaRefreshMissingStats({
                limit: batchLimit,
                onlyMissing: 1,
                beforeId: nextBeforeId
            })
            const processed = Number(result?.processed || 0)
            const updated = Number(result?.updated || 0)
            const failed = Number(result?.failed || 0)
            const unchanged = Number(result?.unchanged || 0)
            nextBeforeId = Number(result?.nextBeforeId || nextBeforeId || 0)
            totalProcessed += processed
            totalUpdated += updated
            totalFailed += failed
            totalUnchanged += unchanged
            if (processed <= 0 || processed < batchLimit || !result?.hasMore) {
                break
            }
        }
        feedback.msgSuccess(
            `统计补全完成：处理 ${totalProcessed}，更新 ${totalUpdated}，失败 ${totalFailed}，未变化 ${totalUnchanged}`
        )
        await getLists()
    } catch (error: any) {
        feedback.msgError(
            error?.msg || error?.message || error?.response?.data?.message || '补全用户/关注失败'
        )
    } finally {
        refreshingStats.value = false
    }
}

/**
 * 格式化 Unix 时间戳，统一列表展示格式。
 */
const formatUnixTime = (value: number | string): string => {
    const timestamp = Number(value || 0)
    if (!Number.isFinite(timestamp) || timestamp <= 0) return '-'
    const date = new Date(timestamp * 1000)
    if (Number.isNaN(date.getTime())) return '-'
    const yyyy = date.getFullYear()
    const mm = String(date.getMonth() + 1).padStart(2, '0')
    const dd = String(date.getDate()).padStart(2, '0')
    const hh = String(date.getHours()).padStart(2, '0')
    const ii = String(date.getMinutes()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd} ${hh}:${ii}`
}

onMounted(async () => {
    await loadFigmaPageConfig()
    await loadCategoryOptions()
    await loadTagOptions()
    await getLists()
})
</script>

<style scoped>
.figma-list-page__title {
    font-weight: 600;
    color: #111827;
}

.figma-list-page__toolbar-right {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: flex-end;
}

.figma-list-page__click-config {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.figma-list-page__click-config-label {
    font-size: 12px;
    color: #6b7280;
}

.figma-list-page__sub {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    font-size: 12px;
    color: #6b7280;
    margin-top: 2px;
}

.figma-list-page__path {
    color: #9ca3af;
}

.figma-list-page__link {
    color: #2563eb;
}

.figma-list-page__hint {
    margin-top: 6px;
    font-size: 12px;
    color: #6b7280;
}

.figma-list-page__import-result {
    width: 100%;
    border: 1px solid #dbeafe;
    border-radius: 8px;
    background: #eff6ff;
    padding: 10px 12px;
    color: #1e3a8a;
    line-height: 1.6;
    font-size: 13px;
}

.figma-edit-drawer {
    padding-right: 4px;
}

.figma-edit-drawer :deep(.el-input-number) {
    width: 180px;
}

.figma-edit-drawer__footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
}

@media (max-width: 960px) {
    .figma-list-page__toolbar-right {
        width: 100%;
        justify-content: flex-start;
    }
}
</style>
