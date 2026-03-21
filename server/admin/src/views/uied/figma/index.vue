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
                    <el-select v-model="queryParams.status" class="w-[140px]" placeholder="全部状态" clearable>
                        <el-option label="草稿" value="draft" />
                        <el-option label="已发布" value="published" />
                    </el-select>
                </el-form-item>
                <el-form-item label="分类">
                    <el-select v-model="queryParams.categoryId" class="w-[180px]" placeholder="全部分类" clearable filterable>
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
            <div class="mb-4 flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <el-button type="primary" @click="handleCreate">
                        <template #icon><icon name="el-icon-Plus" /></template>
                        发布插件
                    </el-button>
                    <el-button @click="openImportDialog">
                        <template #icon><icon name="el-icon-Download" /></template>
                        官方采集
                    </el-button>
                    <el-button @click="getLists">刷新</el-button>
                </div>
                <div class="text-xs text-[#6b7280]">共 {{ pager.count }} 个插件</div>
            </div>

            <el-table size="large" v-loading="pager.loading" :data="pager.lists">
                <el-table-column label="ID" prop="id" width="80" />
                <el-table-column label="插件名称" min-width="260">
                    <template #default="{ row }">
                        <div class="figma-list-page__title">{{ row.name }}</div>
                        <div class="figma-list-page__sub">
                            /{{ row.slug }}
                            <span class="figma-list-page__path">前端路径：{{ resolveFrontendFigmaPath(row) }}</span>
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
                        <el-tag v-if="Number(row.isRecommended) === 1" type="warning" effect="plain">推荐</el-tag>
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
                        <el-button type="primary" link @click="openFrontendFigma(row)">查看前端</el-button>
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
            v-model="importDialogVisible"
            title="官方采集 Figma 插件"
            width="680px"
            :close-on-click-modal="false"
        >
            <el-form :model="importForm" label-width="120px">
                <el-form-item label="来源地址">
                    <el-input v-model="importForm.sourceUrl" placeholder="https://www.figma.com/community/plugins" />
                    <div class="figma-list-page__hint">
                        仅采集公开元信息（封面/标题/简介）并保留来源链接；若官方页面被风控拦截，将自动降级只读通道继续采集。
                    </div>
                </el-form-item>
                <el-form-item label="采集数量">
                    <el-input-number v-model="importForm.limit" :min="1" :max="120" />
                </el-form-item>
                <el-form-item label="默认分类">
                    <el-select v-model="importForm.categoryId" clearable filterable placeholder="不指定则保持未分类" class="w-[360px]">
                        <el-option
                            v-for="item in categoryOptions"
                            :key="item.id"
                            :label="item.name"
                            :value="item.id"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item label="导入状态">
                    <el-radio-group v-model="importForm.status">
                        <el-radio-button label="published">直接发布</el-radio-button>
                        <el-radio-button label="draft">导入草稿</el-radio-button>
                    </el-radio-group>
                </el-form-item>
                <el-form-item label="标题简介汉化">
                    <el-switch v-model="importForm.translate" />
                    <div class="figma-list-page__hint">开启后会调用 AI 配置进行汉化，若失败自动保留原文。</div>
                </el-form-item>
                <el-form-item label="导入结果" v-if="importResultText">
                    <div class="figma-list-page__import-result">{{ importResultText }}</div>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="importDialogVisible = false">关闭</el-button>
                <el-button type="primary" :loading="importing" @click="handleImportOfficial">开始采集</el-button>
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
import feedback from '@/utils/feedback'
import { usePaging } from '@/hooks/usePaging'
import {
    uiedFigmaList,
    uiedFigmaDelete,
    uiedFigmaCategoryAll,
    uiedFigmaImportOfficial,
} from '@/api/uied'

interface FigmaCategoryOption {
    id: number
    name: string
}

interface FigmaImportResult {
    sourceUrl: string
    scanned: number
    created: number
    updated: number
    failed: number
}

const router = useRouter()

const queryParams = reactive({
    keyword: '',
    status: '',
    categoryId: '' as number | string,
})

const categoryOptions = ref<FigmaCategoryOption[]>([])
const importDialogVisible = ref(false)
const importing = ref(false)
const importResultText = ref('')
const importForm = reactive({
    sourceUrl: 'https://www.figma.com/community/plugins',
    limit: 20,
    categoryId: undefined as number | undefined,
    status: 'published' as 'draft' | 'published',
    translate: true,
})

const { pager, getLists, resetPage, resetParams } = usePaging({
    fetchFun: uiedFigmaList,
    params: queryParams,
})

/**
 * 加载分类选项，用于列表筛选与采集默认分类选择。
 */
const loadCategoryOptions = async () => {
    const rows = await uiedFigmaCategoryAll({})
    categoryOptions.value = (Array.isArray(rows) ? rows : [])
        .map((item: any) => ({
            id: Number(item.id || 0),
            name: String(item.name || ''),
        }))
        .filter((item) => item.id > 0 && item.name)
}

/**
 * 跳转到发布页面创建新插件。
 */
const handleCreate = () => {
    router.push('/figma-center/figma-publish')
}

/**
 * 跳转到发布页面编辑插件。
 */
const handleEdit = (row: any) => {
    const id = Number(row?.id || 0)
    if (!id) return
    router.push(`/figma-center/figma-publish?id=${id}`)
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
 * 打开官方采集弹窗并清空上次结果。
 */
const openImportDialog = () => {
    importResultText.value = ''
    importDialogVisible.value = true
}

/**
 * 调用后端采集官方 Figma 插件。
 */
const handleImportOfficial = async () => {
    importing.value = true
    importResultText.value = ''
    try {
        const result = await uiedFigmaImportOfficial({
            sourceUrl: importForm.sourceUrl,
            limit: Number(importForm.limit || 20),
            categoryId: importForm.categoryId || null,
            status: importForm.status,
            translate: importForm.translate,
        }) as FigmaImportResult
        importResultText.value = `来源：${result?.sourceUrl || '-'} ｜ 扫描：${Number(result?.scanned || 0)} ｜ 新增：${Number(result?.created || 0)} ｜ 更新：${Number(result?.updated || 0)} ｜ 失败：${Number(result?.failed || 0)}`
        feedback.msgSuccess('采集完成')
        await getLists()
    } finally {
        importing.value = false
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
    await loadCategoryOptions()
    await getLists()
})
</script>

<style scoped>
.figma-list-page__title {
    font-weight: 600;
    color: #111827;
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
</style>
