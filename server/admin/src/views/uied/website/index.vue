<!--
 * @file views/uied/website/index.vue
 * @description UIED 网站管理列表页面
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 3.1.0 - 增加前端路径快捷查看列
-->
<template>
    <div class="website-lists">
        <el-card class="!border-none" shadow="never">
            <el-alert
                title="筛选提示：支持多状态 + 多标记组合筛选；草稿支持前端预览（自动带 preview 参数）。"
                type="info"
                :closable="false"
                class="mb-4"
            />
            <el-form ref="formRef" class="mb-[-16px]" :model="queryParams" :inline="true">
                <el-form-item label="网站名称">
                    <el-input
                        class="w-[200px]"
                        v-model="queryParams.keyword"
                        placeholder="搜索名称/描述/URL"
                        clearable
                        @keyup.enter="resetPage"
                        @clear="resetPage"
                    />
                </el-form-item>
                <el-form-item label="所属分类">
                    <el-select
                        class="w-[200px]"
                        v-model="queryParams.categoryId"
                        clearable
                        placeholder="全部分类"
                        @change="resetPage"
                    >
                        <el-option
                            v-for="item in categoryOptions"
                            :key="item.id"
                            :label="item.label"
                            :value="item.id"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item>
                    <el-checkbox
                        v-model="queryParams.includeChildren"
                        :disabled="!queryParams.categoryId"
                        @change="resetPage"
                    >
                        包含子分类
                    </el-checkbox>
                </el-form-item>
                <el-form-item label="显示状态">
                    <el-select
                        class="w-[220px]"
                        v-model="queryParams.statusList"
                        multiple
                        collapse-tags
                        collapse-tags-tooltip
                        clearable
                        placeholder="多选状态"
                        @change="resetPage"
                    >
                        <el-option label="显示/已发布" value="active" />
                        <el-option label="隐藏" value="disabled" />
                        <el-option label="待审核" value="unchecked" />
                        <el-option label="草稿" value="draft" />
                        <el-option label="异常" value="failed" />
                    </el-select>
                </el-form-item>
                <el-form-item label="标记筛选">
                    <el-select
                        class="w-[220px]"
                        v-model="queryParams.flagList"
                        multiple
                        collapse-tags
                        collapse-tags-tooltip
                        clearable
                        placeholder="多选标记"
                        @change="resetPage"
                    >
                        <el-option label="置顶" value="pinned" />
                        <el-option label="热门" value="hot" />
                        <el-option label="推荐" value="featured" />
                        <el-option label="新站" value="new" />
                    </el-select>
                </el-form-item>
                <el-form-item label="排序方式">
                    <el-select
                        class="w-[180px]"
                        v-model="queryParams.sortBy"
                        clearable
                        placeholder="默认排序"
                        @change="resetPage"
                    >
                        <el-option label="默认（置顶 + 排序值）" value="default" />
                        <el-option label="排序值 升序" value="sort_asc" />
                        <el-option label="排序值 降序" value="sort_desc" />
                        <el-option label="点击量 降序" value="click_desc" />
                        <el-option label="创建时间 新->旧" value="create_desc" />
                        <el-option label="创建时间 旧->新" value="create_asc" />
                        <el-option label="更新时间 新->旧" value="update_desc" />
                        <el-option label="更新时间 旧->新" value="update_asc" />
                    </el-select>
                </el-form-item>
                <el-form-item label="详情内容">
                    <el-select
                        class="w-[140px]"
                        v-model="queryParams.hasDetailContent"
                        clearable
                        placeholder="全部"
                        @change="resetPage"
                    >
                        <el-option label="有详情" value="1" />
                        <el-option label="无详情" value="0" />
                    </el-select>
                </el-form-item>
                <el-form-item label="缩略图">
                    <el-select
                        class="w-[140px]"
                        v-model="queryParams.hasThumbnail"
                        clearable
                        placeholder="全部"
                        @change="resetPage"
                    >
                        <el-option label="有缩略图" value="1" />
                        <el-option label="无缩略图" value="0" />
                    </el-select>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="resetPage">查询</el-button>
                    <el-button @click="resetParams">重置</el-button>
                </el-form-item>
            </el-form>
        </el-card>
        <el-card class="!border-none mt-4" shadow="never">
            <div class="mb-4 flex justify-between">
                <div>
                    <el-button type="primary" @click="handleAdd">
                        <template #icon><icon name="el-icon-Plus" /></template>
                        添加网站
                    </el-button>
                    <el-button type="success" plain @click="openBatchImportDialog">
                        批量导入网址
                    </el-button>
                    <el-button
                        type="danger"
                        :disabled="!selectedIds.length"
                        @click="handleBatchDelete"
                    >
                        批量删除
                    </el-button>
                </div>
                <div class="text-gray-400">共 {{ pager.count }} 个网站</div>
            </div>
            <el-table
                size="large"
                v-loading="pager.loading"
                :data="pager.lists"
                @selection-change="handleSelectionChange"
            >
                <el-table-column type="selection" width="50" />
                <el-table-column label="ID" prop="id" width="80" />
                <el-table-column label="图标" width="70">
                    <template #default="{ row }">
                        <el-avatar
                            v-if="row.iconUrl"
                            :src="row.iconUrl"
                            :size="32"
                            shape="square"
                        />
                        <el-avatar v-else :size="32" shape="square">
                            {{ row.name?.charAt(0) }}
                        </el-avatar>
                    </template>
                </el-table-column>
                <el-table-column
                    label="网站名称"
                    prop="name"
                    min-width="150"
                    show-overflow-tooltip
                />
                <el-table-column label="分类" prop="categoryName" width="120" />
                <el-table-column label="URL" min-width="200" show-overflow-tooltip>
                    <template #default="{ row }">
                        <a :href="row.url" target="_blank" class="text-primary hover:underline">{{
                            row.url
                        }}</a>
                    </template>
                </el-table-column>
                <el-table-column label="前端" width="80" align="center">
                    <template #default="{ row }">
                        <a :href="getFrontendUrl(row)" target="_blank">
                            <el-button type="primary" link size="small">
                                {{ isDraftWebsite(row) ? '预览' : '查看' }}
                            </el-button>
                        </a>
                    </template>
                </el-table-column>
                <el-table-column label="点击量" prop="clickCount" width="90" />
                <el-table-column label="排序" prop="sortOrder" width="80" />
                <el-table-column label="状态" width="92">
                    <template #default="{ row }">
                        <el-tag :type="getWebsiteStatusTagType(row.status)" size="small">
                            {{ getWebsiteStatusLabel(row.status) }}
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

        <el-dialog
            v-model="batchImportDialogVisible"
            title="批量导入网址"
            width="760px"
            destroy-on-close
        >
            <el-form :model="batchImportForm" label-width="120px">
                <el-form-item label="所属分类" required>
                    <el-select
                        v-model="batchImportForm.categoryId"
                        placeholder="请选择分类"
                        filterable
                        clearable
                        style="width: 100%"
                    >
                        <el-option
                            v-for="item in categoryOptions"
                            :key="item.id"
                            :label="item.label"
                            :value="item.id"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item label="网址列表" required>
                    <el-input
                        v-model="batchImportForm.urlsText"
                        type="textarea"
                        :rows="9"
                        placeholder="每行一个网址，支持不带协议（示例：openai.com）"
                    />
                    <div class="text-xs text-tx-secondary mt-2">
                        导入规则：自动校验重复主域名；已存在域名会自动跳过，不重复收录。
                    </div>
                </el-form-item>
                <el-form-item label="发布状态">
                    <el-radio-group v-model="batchImportForm.status">
                        <el-radio-button label="draft">草稿</el-radio-button>
                        <el-radio-button label="active">发布</el-radio-button>
                        <el-radio-button label="disabled">隐藏</el-radio-button>
                    </el-radio-group>
                </el-form-item>
                <el-form-item label="导入选项">
                    <el-space direction="vertical" alignment="start" :size="8">
                        <el-checkbox v-model="batchImportForm.fetchSeo">
                            自动获取网站信息（标题/简介/关键词/标签/favicon）
                        </el-checkbox>
                        <el-checkbox v-model="batchImportForm.generateDetailContent">
                            导入后自动用 AI 生成详情正文
                        </el-checkbox>
                    </el-space>
                </el-form-item>
            </el-form>

            <el-alert
                v-if="batchImportResult"
                class="mt-2"
                type="info"
                :closable="false"
                :title="`导入结果：新增 ${batchImportResult.created}，跳过 ${batchImportResult.skipped}，失败 ${batchImportResult.failed}`"
            />
            <el-card
                v-if="batchImportResult && batchImportResult.rows.length > 0"
                class="mt-3"
                shadow="never"
            >
                <template #header>
                    <div class="flex items-center justify-between">
                        <span>结果明细（{{ batchImportResult.rows.length }} 条）</span>
                        <el-button link type="primary" @click="handleExportBatchImportCsv">
                            一键导出 CSV
                        </el-button>
                    </div>
                </template>
                <el-table :data="batchImportResult.rows" size="small" max-height="320">
                    <el-table-column type="index" label="#" width="56" />
                    <el-table-column label="状态" width="88">
                        <template #default="{ row }">
                            <el-tag :type="getBatchImportStatusTagType(row.status)" size="small">
                                {{ getBatchImportStatusLabel(row.status) }}
                            </el-tag>
                        </template>
                    </el-table-column>
                    <el-table-column label="网址" min-width="220" show-overflow-tooltip>
                        <template #default="{ row }">{{ row.url || '-' }}</template>
                    </el-table-column>
                    <el-table-column label="网站ID" width="90">
                        <template #default="{ row }">{{ row.websiteId || '-' }}</template>
                    </el-table-column>
                    <el-table-column label="网站名称" min-width="160" show-overflow-tooltip>
                        <template #default="{ row }">{{ row.name || '-' }}</template>
                    </el-table-column>
                    <el-table-column label="原因/说明" min-width="240" show-overflow-tooltip>
                        <template #default="{ row }">{{ row.reason || row.message || '-' }}</template>
                    </el-table-column>
                </el-table>
            </el-card>

            <template #footer>
                <el-button @click="batchImportDialogVisible = false">取消</el-button>
                <el-button type="primary" :loading="batchImportLoading" @click="handleBatchImportSubmit">
                    开始导入
                </el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script lang="ts" setup name="uiedWebsite">
import {
    uiedWebsiteList,
    uiedWebsiteDelete,
    uiedWebsiteBatchDelete,
    uiedWebsiteBatchImport,
    uiedCategoryAll
} from '@/api/uied'
import { usePaging } from '@/hooks/usePaging'
import feedback from '@/utils/feedback'

const router = useRouter()
const route = useRoute()

// 前端访问地址（开发环境 localhost:3003，生产环境可根据实际域名修改）
const FRONTEND_BASE_URL = 'http://localhost:3003'
/**
 * 判断是否草稿网站，草稿前端链接自动附加 preview=1。
 */
const isDraftWebsite = (row: any) => String(row?.status || '').trim().toLowerCase() === 'draft'

/**
 * 生成前端详情链接：草稿自动走预览模式。
 */
const getFrontendUrl = (row: any) => {
    const path = row.slug || row.id
    const previewSuffix = isDraftWebsite(row) ? '?preview=1' : ''
    return `${FRONTEND_BASE_URL}/website/${path}${previewSuffix}`
}

const queryParams = reactive({
    keyword: '',
    categoryId: '',
    includeChildren: true,
    statusList: [] as string[],
    flagList: [] as string[],
    sortBy: 'default',
    hasDetailContent: '',
    hasThumbnail: ''
})

/**
 * 批量导入结果行（用于明细表 + CSV 导出）
 */
interface BatchImportResultRow {
    status: string
    url: string
    websiteId?: number
    name?: string
    reason?: string
    message?: string
}

const batchImportDialogVisible = ref(false)
const batchImportLoading = ref(false)
const batchImportResult = ref<{
    created: number
    skipped: number
    failed: number
    rows: BatchImportResultRow[]
} | null>(null)
const batchImportForm = reactive({
    categoryId: '' as string | number,
    urlsText: '',
    fetchSeo: true,
    generateDetailContent: false,
    status: 'draft'
})

/**
 * 列表请求参数归一化：多选字段统一转逗号串，后端可直接解析。
 */
const fetchWebsiteList = (params: any) => {
    const payload = { ...params }
    payload.statusList = Array.isArray(payload.statusList) ? payload.statusList.join(',') : ''
    payload.flagList = Array.isArray(payload.flagList) ? payload.flagList.join(',') : ''
    if (!payload.sortBy || payload.sortBy === 'default') delete payload.sortBy
    return uiedWebsiteList(payload)
}

const { pager, getLists, resetPage, resetParams } = usePaging({
    fetchFun: fetchWebsiteList,
    params: queryParams
})

/**
 * 统一格式化网站状态文案（兼容历史 normal 与新版 active）。
 */
const getWebsiteStatusLabel = (status: string) => {
    const normalized = String(status || '').trim().toLowerCase()
    if (normalized === 'active' || normalized === 'normal') return '已发布'
    if (normalized === 'disabled') return '已隐藏'
    if (normalized === 'draft') return '草稿'
    if (normalized === 'failed') return '异常'
    return '待审核'
}

/**
 * 根据状态返回标签风格，提升列表可读性。
 */
const getWebsiteStatusTagType = (status: string) => {
    const normalized = String(status || '').trim().toLowerCase()
    if (normalized === 'active' || normalized === 'normal') return 'success'
    if (normalized === 'disabled') return 'info'
    if (normalized === 'draft') return 'warning'
    if (normalized === 'failed') return 'danger'
    return ''
}

// 分类列表
const categoryList = ref<any[]>([])
const categoryOptions = computed(() => buildCategoryOptions(categoryList.value))

/**
 * 构建带层级缩进的分类下拉选项，便于后台筛选父子分类
 */
const buildCategoryOptions = (categories: any[]) => {
    if (!Array.isArray(categories) || categories.length === 0) return []

    const parentMap = new Map<any, any[]>()
    const nodeMap = new Map<any, any>()
    const visited = new Set<any>()
    const options: any[] = []

    categories.forEach((item) => {
        nodeMap.set(item.id, item)
        const parentId = item.parentId ?? null
        if (!parentMap.has(parentId)) parentMap.set(parentId, [])
        parentMap.get(parentId)?.push(item)
    })

    const walk = (parentId: any, level = 0) => {
        const children = parentMap.get(parentId) || []
        children.forEach((item) => {
            if (visited.has(item.id)) return
            visited.add(item.id)
            const indent = level > 0 ? `${'　'.repeat(level)}└ ` : ''
            options.push({
                ...item,
                label: `${indent}${item.name}`
            })
            walk(item.id, level + 1)
        })
    }

    walk(null, 0)
    walk(undefined, 0)

    // 兜底：异常 parentId 数据仍然可选，避免后台无法筛选
    categories.forEach((item) => {
        if (visited.has(item.id)) return
        const hasParent = item.parentId && nodeMap.has(item.parentId)
        options.push({
            ...item,
            label: `${hasParent ? '　└ ' : ''}${item.name}`
        })
    })

    return options
}

/**
 * 获取分类列表
 */
const getCategoryList = async () => {
    try {
        const res = await uiedCategoryAll()
        categoryList.value = res || []
    } catch (error) {
        console.error('获取分类列表失败:', error)
    }
}

// 选中的ID
const selectedIds = ref<number[]>([])
const handleSelectionChange = (rows: any[]) => {
    selectedIds.value = rows.map((row) => row.id)
}

// 跳转到编辑页面
const handleAdd = () => {
    router.push('/uied/website/edit')
}

/**
 * 打开批量导入弹窗并重置结果态
 */
const openBatchImportDialog = () => {
    batchImportDialogVisible.value = true
    batchImportResult.value = null
}

/**
 * 规范化批量导入明细行，兼容后端不同返回结构。
 */
const normalizeBatchImportRows = (rows: any): BatchImportResultRow[] => {
    if (!Array.isArray(rows)) return []
    return rows.map((item: any) => ({
        status: String(item?.status || '').trim().toLowerCase(),
        url: String(item?.url || '').trim(),
        websiteId:
            Number.isFinite(Number(item?.websiteId)) && Number(item.websiteId) > 0
                ? Number(item.websiteId)
                : undefined,
        name: String(item?.name || '').trim(),
        reason: String(item?.reason || '').trim(),
        message: String(item?.message || '').trim()
    }))
}

/**
 * 批量导入状态文案
 */
const getBatchImportStatusLabel = (status: string) => {
    const normalized = String(status || '').trim().toLowerCase()
    if (normalized === 'created' || normalized === 'success') return '成功'
    if (normalized === 'skipped' || normalized === 'skip') return '跳过'
    if (normalized === 'failed' || normalized === 'error') return '失败'
    return '未知'
}

/**
 * 批量导入状态标签样式
 */
const getBatchImportStatusTagType = (status: string) => {
    const normalized = String(status || '').trim().toLowerCase()
    if (normalized === 'created' || normalized === 'success') return 'success'
    if (normalized === 'skipped' || normalized === 'skip') return 'warning'
    if (normalized === 'failed' || normalized === 'error') return 'danger'
    return 'info'
}

/**
 * 导出批量导入明细 CSV，便于运营归档和复盘失败原因。
 */
const handleExportBatchImportCsv = () => {
    const rows = batchImportResult.value?.rows || []
    if (rows.length === 0) {
        feedback.msgWarning('暂无可导出的明细数据')
        return
    }
    const escapeCell = (value: unknown) => {
        const text = String(value ?? '').replace(/"/g, '""')
        return `"${text}"`
    }
    const header = ['序号', '状态', '网址', '网站ID', '网站名称', '原因/说明']
    const lines = rows.map((row, index) =>
        [
            index + 1,
            getBatchImportStatusLabel(row.status),
            row.url || '',
            row.websiteId || '',
            row.name || '',
            row.reason || row.message || ''
        ]
            .map(escapeCell)
            .join(',')
    )
    const csv = [header.map(escapeCell).join(','), ...lines].join('\n')
    const filename = `website_batch_import_${Date.now()}.csv`
    const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' })
    const objectUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(objectUrl)
    feedback.msgSuccess('CSV 导出成功')
}

/**
 * 提交批量导入任务
 */
const handleBatchImportSubmit = async () => {
    const categoryId = Number(batchImportForm.categoryId || 0)
    const urlsText = String(batchImportForm.urlsText || '').trim()
    if (!categoryId) {
        feedback.msgWarning('请选择所属分类')
        return
    }
    if (!urlsText) {
        feedback.msgWarning('请填写至少一个网址')
        return
    }
    batchImportLoading.value = true
    try {
        const result = await uiedWebsiteBatchImport({
            categoryId,
            urls: urlsText,
            fetchSeo: batchImportForm.fetchSeo,
            generateDetailContent: batchImportForm.generateDetailContent,
            status: batchImportForm.status
        })
        const resultData = result?.data?.data || result?.data || result || {}
        const normalizedRows = normalizeBatchImportRows(resultData?.rows || result?.rows)
        batchImportResult.value = {
            created: Number(resultData?.created || 0),
            skipped: Number(resultData?.skipped || 0),
            failed: Number(resultData?.failed || 0),
            rows: normalizedRows
        }
        feedback.msgSuccess(
            `导入完成：新增 ${batchImportResult.value.created} 条，跳过 ${batchImportResult.value.skipped} 条，失败 ${batchImportResult.value.failed} 条`
        )
        getLists()
    } catch (error: any) {
        feedback.msgError(error?.msg || error?.message || '批量导入失败')
    } finally {
        batchImportLoading.value = false
    }
}

const handleEdit = (row: any) => {
    router.push(`/uied/website/edit?id=${row.id}`)
}

const handleDelete = async (id: number) => {
    await feedback.confirm('确定要删除该网站吗？')
    await uiedWebsiteDelete({ id })
    feedback.msgSuccess('删除成功')
    getLists()
}

const handleBatchDelete = async () => {
    await feedback.confirm(`确定要删除选中的 ${selectedIds.value.length} 个网站吗？`)
    await uiedWebsiteBatchDelete({ ids: selectedIds.value })
    feedback.msgSuccess('删除成功')
    selectedIds.value = []
    getLists()
}

/**
 * 监听编辑页返回的刷新标记，自动刷新列表数据。
 */
watch(
    () => route.query.refresh,
    (refreshToken, previousToken) => {
        if (!refreshToken || refreshToken === previousToken) return
        getLists()
    }
)

onMounted(() => {
    getCategoryList()
})

getLists()
</script>
