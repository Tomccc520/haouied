<!--
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-22
 */
-->
<template>
    <div class="figma-recommend-page">
        <el-card class="!border-none" shadow="never">
            <el-form :model="queryParams" :inline="true" class="mb-[-16px]">
                <el-form-item label="关键词">
                    <el-input
                        v-model="queryParams.keyword"
                        class="w-[240px]"
                        placeholder="插件名称/官方链接/推荐人"
                        clearable
                        @keyup.enter="resetPage"
                    />
                </el-form-item>
                <el-form-item label="状态">
                    <el-select v-model="queryParams.status" class="w-[140px]" clearable placeholder="全部状态">
                        <el-option label="待审核" value="pending" />
                        <el-option label="已通过" value="approved" />
                        <el-option label="已拒绝" value="rejected" />
                    </el-select>
                </el-form-item>
                <el-form-item label="分类">
                    <el-select v-model="queryParams.categoryId" class="w-[180px]" clearable filterable placeholder="全部分类">
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
                    <el-button @click="getLists">刷新</el-button>
                </el-form-item>
            </el-form>
        </el-card>

        <el-card class="!border-none mt-4" shadow="never">
            <div class="mb-4 flex items-center justify-between">
                <div class="text-sm text-[#4b5563]">
                    Figma 插件推荐审核队列，用于接收前台用户推荐并人工审核后入库。
                </div>
                <div class="text-xs text-[#6b7280]">共 {{ pager.count }} 条推荐</div>
            </div>

            <el-table size="large" v-loading="pager.loading" :data="pager.lists">
                <el-table-column label="ID" prop="id" width="80" />
                <el-table-column label="插件信息" min-width="320">
                    <template #default="{ row }">
                        <div class="figma-recommend-page__plugin-name">{{ row.pluginName }}</div>
                        <a
                            v-if="row.officialUrl"
                            class="figma-recommend-page__plugin-link"
                            :href="row.officialUrl"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {{ row.officialUrl }}
                        </a>
                    </template>
                </el-table-column>
                <el-table-column label="意向分类" min-width="140">
                    <template #default="{ row }">{{ row.categoryName || '-' }}</template>
                </el-table-column>
                <el-table-column label="推荐人" min-width="180">
                    <template #default="{ row }">
                        <div>{{ row.submitterName || '-' }}</div>
                        <div class="text-xs text-[#6b7280]">{{ row.submitterEmail || row.submitterWechat || '-' }}</div>
                    </template>
                </el-table-column>
                <el-table-column label="状态" width="110">
                    <template #default="{ row }">
                        <el-tag :type="resolveStatusType(row.status)">
                            {{ resolveStatusLabel(row.status) }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="提交时间" min-width="160">
                    <template #default="{ row }">{{ formatUnixTime(row.createTime) }}</template>
                </el-table-column>
                <el-table-column label="审核时间" min-width="160">
                    <template #default="{ row }">{{ formatUnixTime(row.reviewTime) }}</template>
                </el-table-column>
                <el-table-column label="操作" width="280" fixed="right">
                    <template #default="{ row }">
                        <el-button
                            v-if="row.status === 'pending'"
                            type="success"
                            link
                            @click="openApproveDialog(row)"
                        >
                            通过
                        </el-button>
                        <el-button
                            v-if="row.status === 'pending'"
                            type="danger"
                            link
                            @click="openRejectDialog(row)"
                        >
                            拒绝
                        </el-button>
                        <el-button type="primary" link @click="handleView(row)">查看</el-button>
                        <el-button type="danger" link @click="handleDelete(row.id)">删除</el-button>
                    </template>
                </el-table-column>
            </el-table>

            <div class="flex justify-end mt-4">
                <pagination v-model="pager" @change="getLists" />
            </div>
        </el-card>

        <el-dialog v-model="detailDialogVisible" title="推荐详情" width="720px">
            <el-descriptions :column="1" border>
                <el-descriptions-item label="插件名称">{{ detailData.pluginName || '-' }}</el-descriptions-item>
                <el-descriptions-item label="官方链接">
                    <a
                        v-if="detailData.officialUrl"
                        :href="detailData.officialUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {{ detailData.officialUrl }}
                    </a>
                    <span v-else>-</span>
                </el-descriptions-item>
                <el-descriptions-item label="推荐简介">{{ detailData.summary || '-' }}</el-descriptions-item>
                <el-descriptions-item label="意向分类">{{ detailData.categoryName || '-' }}</el-descriptions-item>
                <el-descriptions-item label="推荐说明">{{ detailData.submitNote || '-' }}</el-descriptions-item>
                <el-descriptions-item label="推荐人">{{ detailData.submitterName || '-' }}</el-descriptions-item>
                <el-descriptions-item label="邮箱">{{ detailData.submitterEmail || '-' }}</el-descriptions-item>
                <el-descriptions-item label="微信">{{ detailData.submitterWechat || '-' }}</el-descriptions-item>
                <el-descriptions-item label="来源IP">{{ detailData.sourceIp || '-' }}</el-descriptions-item>
                <el-descriptions-item label="状态">
                    <el-tag :type="resolveStatusType(detailData.status)">
                        {{ resolveStatusLabel(detailData.status) }}
                    </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="审核备注">{{ detailData.reviewNote || '-' }}</el-descriptions-item>
                <el-descriptions-item label="审核人">{{ detailData.reviewerName || '-' }}</el-descriptions-item>
                <el-descriptions-item label="提交时间">{{ formatUnixTime(detailData.createTime) }}</el-descriptions-item>
                <el-descriptions-item label="审核时间">{{ formatUnixTime(detailData.reviewTime) }}</el-descriptions-item>
            </el-descriptions>
        </el-dialog>

        <el-dialog v-model="approveDialogVisible" title="审核通过并入库" width="520px">
            <el-form :model="approveForm" label-width="110px">
                <el-form-item label="插件名称">
                    <el-input v-model="approveForm.pluginName" placeholder="请输入插件名称" />
                </el-form-item>
                <el-form-item label="官方链接">
                    <el-input v-model="approveForm.officialUrl" placeholder="https://www.figma.com/community/plugin/..." />
                </el-form-item>
                <el-form-item label="归属分类">
                    <el-select v-model="approveForm.categoryId" clearable filterable class="w-full" placeholder="不指定则沿用推荐分类">
                        <el-option
                            v-for="item in categoryOptions"
                            :key="item.id"
                            :label="item.name"
                            :value="item.id"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item label="发布状态">
                    <el-radio-group v-model="approveForm.publishStatus">
                        <el-radio-button label="published">直接发布</el-radio-button>
                        <el-radio-button label="draft">入库草稿</el-radio-button>
                    </el-radio-group>
                </el-form-item>
                <el-form-item label="审核备注">
                    <el-input
                        v-model="approveForm.reviewNote"
                        type="textarea"
                        :rows="3"
                        placeholder="可选：填写通过说明"
                    />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="approveDialogVisible = false">取消</el-button>
                <el-button type="primary" :loading="approving" @click="confirmApprove">确认通过</el-button>
            </template>
        </el-dialog>

        <el-dialog v-model="rejectDialogVisible" title="拒绝推荐" width="480px">
            <el-input
                v-model="rejectForm.reviewNote"
                type="textarea"
                :rows="4"
                placeholder="请输入拒绝原因"
            />
            <template #footer>
                <el-button @click="rejectDialogVisible = false">取消</el-button>
                <el-button type="primary" :loading="rejecting" @click="confirmReject">确认拒绝</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script lang="ts" setup name="uiedFigmaRecommend">
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-22
 */
import { onMounted, reactive, ref } from 'vue'
import feedback from '@/utils/feedback'
import { usePaging } from '@/hooks/usePaging'
import Pagination from '@/components/pagination/index.vue'
import {
    uiedFigmaCategoryAll,
    uiedFigmaRecommendApprove,
    uiedFigmaRecommendDelete,
    uiedFigmaRecommendDetail,
    uiedFigmaRecommendList,
    uiedFigmaRecommendReject,
} from '@/api/uied'

interface CategoryOption {
    id: number
    name: string
}

type RecommendStatus = 'pending' | 'approved' | 'rejected'
type TagType = '' | 'success' | 'warning' | 'danger' | 'info'

const statusLabelMap: Record<RecommendStatus, string> = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝',
}

const statusTypeMap: Record<RecommendStatus, TagType> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
}

/**
 * 解析推荐审核状态文案，兜底未知状态。
 */
const resolveStatusLabel = (status: any): string => {
    const text = String(status || '').trim().toLowerCase()
    if (text === 'approved') return statusLabelMap.approved
    if (text === 'rejected') return statusLabelMap.rejected
    if (text === 'pending') return statusLabelMap.pending
    return text || '-'
}

/**
 * 解析推荐审核状态标签类型，避免模板索引时报错。
 */
const resolveStatusType = (status: any): TagType => {
    const text = String(status || '').trim().toLowerCase()
    if (text === 'approved') return statusTypeMap.approved
    if (text === 'rejected') return statusTypeMap.rejected
    if (text === 'pending') return statusTypeMap.pending
    return 'info'
}

const queryParams = reactive({
    keyword: '',
    status: 'pending',
    categoryId: '',
})

const categoryOptions = ref<CategoryOption[]>([])
const { pager, getLists, resetPage, resetParams } = usePaging({
    fetchFun: uiedFigmaRecommendList,
    params: queryParams,
})

const detailDialogVisible = ref(false)
const detailData = reactive<any>({})

const approveDialogVisible = ref(false)
const approving = ref(false)
const approveForm = reactive<any>({
    id: 0,
    pluginName: '',
    officialUrl: '',
    categoryId: undefined,
    publishStatus: 'published',
    reviewNote: '',
})

const rejectDialogVisible = ref(false)
const rejecting = ref(false)
const rejectForm = reactive<any>({
    id: 0,
    reviewNote: '',
})

/**
 * 格式化 Unix 时间戳。
 */
const formatUnixTime = (value: any): string => {
    const ts = Number(value || 0)
    if (!Number.isFinite(ts) || ts <= 0) return '-'
    return new Date(ts * 1000).toLocaleString('zh-CN')
}

/**
 * 加载分类下拉选项。
 */
const loadCategoryOptions = async () => {
    const rows = await uiedFigmaCategoryAll({})
    categoryOptions.value = Array.isArray(rows)
        ? rows.map((item: any) => ({ id: Number(item.id || 0), name: String(item.name || '') })).filter((item: CategoryOption) => item.id > 0 && item.name)
        : []
}

/**
 * 打开详情弹窗。
 */
const handleView = async (row: any) => {
    const id = Number(row?.id || 0)
    if (!id) return
    const detail = await uiedFigmaRecommendDetail({ id })
    Object.assign(detailData, detail || {})
    detailDialogVisible.value = true
}

/**
 * 打开审核通过弹窗并预填数据。
 */
const openApproveDialog = (row: any) => {
    approveForm.id = Number(row?.id || 0)
    approveForm.pluginName = String(row?.pluginName || '')
    approveForm.officialUrl = String(row?.officialUrl || '')
    approveForm.categoryId = row?.categoryId ? Number(row.categoryId) : undefined
    approveForm.publishStatus = 'published'
    approveForm.reviewNote = ''
    approveDialogVisible.value = true
}

/**
 * 提交审核通过。
 */
const confirmApprove = async () => {
    if (!Number(approveForm.id)) return
    if (!String(approveForm.pluginName || '').trim()) {
        feedback.msgError('插件名称不能为空')
        return
    }
    if (!String(approveForm.officialUrl || '').trim()) {
        feedback.msgError('官方链接不能为空')
        return
    }
    approving.value = true
    try {
        await uiedFigmaRecommendApprove({
            id: approveForm.id,
            pluginName: approveForm.pluginName,
            officialUrl: approveForm.officialUrl,
            categoryId: approveForm.categoryId || 0,
            publishStatus: approveForm.publishStatus,
            reviewNote: approveForm.reviewNote,
        })
        feedback.msgSuccess('审核通过并已入库')
        approveDialogVisible.value = false
        getLists()
    } finally {
        approving.value = false
    }
}

/**
 * 打开拒绝弹窗。
 */
const openRejectDialog = (row: any) => {
    rejectForm.id = Number(row?.id || 0)
    rejectForm.reviewNote = ''
    rejectDialogVisible.value = true
}

/**
 * 提交审核拒绝。
 */
const confirmReject = async () => {
    if (!Number(rejectForm.id)) return
    if (!String(rejectForm.reviewNote || '').trim()) {
        feedback.msgError('请填写拒绝原因')
        return
    }
    rejecting.value = true
    try {
        await uiedFigmaRecommendReject({
            id: rejectForm.id,
            reviewNote: rejectForm.reviewNote,
        })
        feedback.msgSuccess('已拒绝该推荐')
        rejectDialogVisible.value = false
        getLists()
    } finally {
        rejecting.value = false
    }
}

/**
 * 删除推荐记录。
 */
const handleDelete = async (id: number) => {
    const targetId = Number(id || 0)
    if (!targetId) return
    await feedback.confirm('确定删除该推荐记录吗？删除后不可恢复。')
    await uiedFigmaRecommendDelete({ id: targetId })
    feedback.msgSuccess('删除成功')
    getLists()
}

onMounted(async () => {
    await loadCategoryOptions()
    getLists()
})
</script>

<style scoped>
.figma-recommend-page__plugin-name {
    font-weight: 600;
    color: #111827;
    line-height: 1.4;
}

.figma-recommend-page__plugin-link {
    display: inline-block;
    margin-top: 4px;
    font-size: 12px;
    color: #2563eb;
    word-break: break-all;
}
</style>
