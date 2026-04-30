<!--
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-02-16
 */
-->
<template>
    <div class="submission">
        <el-card class="!border-none" shadow="never">
            <el-form ref="formRef" class="mb-[-16px]" :model="queryParams" :inline="true">
                <el-form-item label="状态">
                    <el-select
                        v-model="queryParams.status"
                        placeholder="全部"
                        clearable
                        style="width: 120px"
                    >
                        <el-option label="待审核" value="pending" />
                        <el-option label="已通过" value="approved" />
                        <el-option label="已拒绝" value="rejected" />
                    </el-select>
                </el-form-item>
                <el-form-item label="网址">
                    <el-input
                        v-model="queryParams.url"
                        placeholder="请输入网址"
                        clearable
                        @keyup.enter="resetPage"
                    />
                </el-form-item>
                <el-form-item label="服务类型">
                    <el-select
                        v-model="queryParams.serviceType"
                        placeholder="全部"
                        clearable
                        style="width: 180px"
                    >
                        <el-option label="付费提交收录" value="submission" />
                        <el-option label="置顶推荐加购" value="top_recommendation" />
                        <el-option label="Banner 位加购" value="banner_slot" />
                    </el-select>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="resetPage">查询</el-button>
                    <el-button @click="resetParams">重置</el-button>
                    <el-button type="primary" plain @click="handleReconcilePayOrders()"
                        >手动补单</el-button
                    >
                    <el-button type="warning" plain @click="handleOpenSubmissionConfig"
                        >投稿与支付配置</el-button
                    >
                </el-form-item>
            </el-form>
        </el-card>
        <el-card class="!border-none mt-4" shadow="never">
            <el-table v-loading="loading" :data="lists" border>
                <el-table-column label="ID" prop="id" width="80" />
                <el-table-column label="网址" prop="url" min-width="200" show-overflow-tooltip />
                <el-table-column label="名称" prop="name" width="150" />
                <el-table-column label="服务类型" prop="serviceType" width="170">
                    <template #default="{ row }">
                        <el-tag :type="getServiceTypeTagType(row)">
                            {{ getServiceTypeLabel(row) }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="提交人" prop="submitterName" width="100" />
                <el-table-column label="邮箱" prop="submitterEmail" width="150" />
                <el-table-column label="支付" width="160">
                    <template #default="{ row }">
                        <el-tag v-if="row.payStatus === 'paid'" type="success">已支付</el-tag>
                        <el-tag v-else-if="row.payStatus === 'created'" type="warning"
                            >待支付</el-tag
                        >
                        <el-tag v-else-if="row.payStatus === 'closed'" type="danger">已关闭</el-tag>
                        <el-tag v-else-if="row.payStatus === 'free'" type="info">免费</el-tag>
                        <span v-else class="text-muted">-</span>
                    </template>
                </el-table-column>
                <el-table-column label="渠道/金额" width="180">
                    <template #default="{ row }">
                        <div class="text-xs">
                            <div>{{ row.payChannel || '-' }}</div>
                            <div class="text-muted">
                                {{ Number(row.payAmount || 0).toFixed(2) }}
                            </div>
                        </div>
                    </template>
                </el-table-column>
                <el-table-column label="履约" width="160">
                    <template #default="{ row }">
                        <el-tag :type="getFulfillmentStatusType(row.fulfillmentStatus)">
                            {{ getFulfillmentStatusLabel(row.fulfillmentStatus) }}
                        </el-tag>
                        <div v-if="row.fulfillmentNote" class="text-muted text-xs mt-1">
                            {{ row.fulfillmentNote }}
                        </div>
                    </template>
                </el-table-column>
                <el-table-column label="状态" prop="status" width="100">
                    <template #default="{ row }">
                        <el-tag :type="getStatusType(row.status)">{{
                            getStatusLabel(row.status)
                        }}</el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="提交时间" prop="createdAt" width="170">
                    <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
                </el-table-column>
                <el-table-column label="操作" width="320" fixed="right">
                    <template #default="{ row }">
                        <template v-if="row.status === 'pending'">
                            <el-button type="success" link @click="handleOpenApprove(row)"
                                >通过</el-button
                            >
                            <el-button type="danger" link @click="handleReject(row)"
                                >拒绝</el-button
                            >
                        </template>
                        <el-button
                            v-if="row.payStatus === 'created' && row.payOrderNo"
                            type="warning"
                            link
                            @click="handleReconcilePayOrders(row.payOrderNo)"
                            >补单</el-button
                        >
                        <el-button
                            v-if="
                                row.status === 'approved' &&
                                row.fulfillmentStatus === 'pending_fulfillment' &&
                                !isPaidOrderUnpaid(row)
                            "
                            type="success"
                            link
                            @click="handleFulfill(row)"
                            >标记履约</el-button
                        >
                        <el-button type="primary" link @click="handleView(row)">查看</el-button>
                        <el-button type="danger" link @click="handleDelete(row.id)">删除</el-button>
                    </template>
                </el-table-column>
            </el-table>
            <div class="flex justify-end mt-4">
                <pagination v-model="pager" @change="getLists" />
            </div>
        </el-card>

        <!-- 详情弹窗 -->
        <el-dialog v-model="showDetail" title="提交详情" width="600px">
            <el-descriptions :column="1" border>
                <el-descriptions-item label="网址">{{ detailData.url }}</el-descriptions-item>
                <el-descriptions-item label="名称">{{ detailData.name }}</el-descriptions-item>
                <el-descriptions-item label="描述">{{
                    detailData.description
                }}</el-descriptions-item>
                <el-descriptions-item label="提交人">{{
                    detailData.submitterName
                }}</el-descriptions-item>
                <el-descriptions-item label="服务类型">{{
                    getServiceTypeLabel(detailData)
                }}</el-descriptions-item>
                <el-descriptions-item v-if="detailData.serviceMeta?.target" label="推广目标">{{
                    detailData.serviceMeta.target
                }}</el-descriptions-item>
                <el-descriptions-item v-if="detailData.serviceMeta?.budget" label="预算区间">{{
                    detailData.serviceMeta.budget
                }}</el-descriptions-item>
                <el-descriptions-item
                    v-if="detailData.serviceMeta?.addons?.length"
                    label="加购项"
                    >{{ detailData.serviceMeta.addons.join(' / ') }}</el-descriptions-item
                >
                <el-descriptions-item
                    v-if="detailData.serviceMeta?.bannerPositions?.length"
                    label="Banner位置"
                    >{{ detailData.serviceMeta.bannerPositions.join(' / ') }}</el-descriptions-item
                >
                <el-descriptions-item v-if="detailData.serviceMeta?.contact" label="联系方式">{{
                    detailData.serviceMeta.contact
                }}</el-descriptions-item>
                <el-descriptions-item label="邮箱">{{
                    detailData.submitterEmail
                }}</el-descriptions-item>
                <el-descriptions-item label="IP">{{ detailData.submitterIp }}</el-descriptions-item>
                <el-descriptions-item label="状态">
                    <el-tag :type="getStatusType(detailData.status)">{{
                        getStatusLabel(detailData.status)
                    }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="履约状态">
                    <el-tag :type="getFulfillmentStatusType(detailData.fulfillmentStatus)">
                        {{ getFulfillmentStatusLabel(detailData.fulfillmentStatus) }}
                    </el-tag>
                </el-descriptions-item>
                <el-descriptions-item v-if="detailData.fulfillmentNote" label="履约备注">{{
                    detailData.fulfillmentNote
                }}</el-descriptions-item>
                <el-descriptions-item v-if="detailData.relatedWebsiteId" label="关联网站ID">{{
                    detailData.relatedWebsiteId
                }}</el-descriptions-item>
                <el-descriptions-item v-if="detailData.fulfilledAt" label="履约完成时间">{{
                    formatTime(detailData.fulfilledAt)
                }}</el-descriptions-item>
                <el-descriptions-item v-if="detailData.rejectReason" label="拒绝原因">{{
                    detailData.rejectReason
                }}</el-descriptions-item>
            </el-descriptions>
        </el-dialog>

        <!-- 审核通过弹窗 -->
        <el-dialog v-model="showApprove" title="审核通过" width="460px">
            <el-alert
                v-if="currentApproveRow && isPaidOrderUnpaid(currentApproveRow)"
                title="该投稿存在待支付订单，请先补单或确认支付后再通过审核。"
                type="warning"
                show-icon
                :closable="false"
                class="mb-4"
            />
            <el-form :model="approveForm" label-width="96px">
                <el-form-item label="审核分类" required>
                    <el-select
                        v-model="approveForm.categoryId"
                        placeholder="请选择收录分类"
                        filterable
                        style="width: 100%"
                    >
                        <el-option
                            v-for="item in categoryOptions"
                            :key="item.id"
                            :label="formatCategoryOptionLabel(item)"
                            :value="item.id"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item label="支付状态">
                    <el-tag :type="getPayStatusType(currentApproveRow?.payStatus)">
                        {{ getPayStatusLabel(currentApproveRow?.payStatus) }}
                    </el-tag>
                </el-form-item>
                <el-form-item label="履约说明">
                    <div class="text-muted">
                        置顶推荐会自动写入前台网站置顶/推荐字段；Banner 位审核通过后进入待履约，需要运营排期后手动标记。
                    </div>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showApprove = false">取消</el-button>
                <el-button type="primary" :loading="approveLoading" @click="confirmApprove"
                    >确认通过</el-button
                >
            </template>
        </el-dialog>

        <!-- 拒绝原因弹窗 -->
        <el-dialog v-model="showReject" title="拒绝原因" width="400px">
            <el-input
                v-model="rejectReason"
                type="textarea"
                :rows="3"
                placeholder="请输入拒绝原因"
            />
            <template #footer>
                <el-button @click="showReject = false">取消</el-button>
                <el-button type="primary" @click="confirmReject">确定</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { usePaging } from '@/hooks/usePaging'
import Pagination from '@/components/pagination/index.vue'
import request from '@/utils/request'
import feedback from '@/utils/feedback'

type TagType = '' | 'success' | 'warning' | 'danger' | 'info'
type SubmissionStatus = 'pending' | 'approved' | 'rejected'

const queryParams = reactive({ status: '', url: '', serviceType: '' })
const router = useRouter()
const { pager, getLists, resetPage, resetParams, lists, loading } = usePaging({
    fetchFun: (params: any) => request.get({ url: '/uied/submission/list', params }),
    params: queryParams
})

const showDetail = ref(false)
const detailData = ref<any>({})
const showApprove = ref(false)
const approveLoading = ref(false)
const currentApproveRow = ref<any>(null)
const approveForm = reactive({ categoryId: undefined as number | undefined })
const categoryOptions = ref<any[]>([])
const showReject = ref(false)
const rejectReason = ref('')
const currentRejectId = ref<number | null>(null)
const statusTypeMap: Record<SubmissionStatus, TagType> = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger'
}
const statusLabelMap: Record<SubmissionStatus, string> = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝'
}
const fulfillmentStatusLabelMap: Record<string, string> = {
    pending_review: '待审核',
    pending_payment: '待支付',
    pending_fulfillment: '待履约',
    fulfilled: '已履约',
    rejected: '已终止'
}
const fulfillmentStatusTypeMap: Record<string, TagType> = {
    pending_review: 'warning',
    pending_payment: 'warning',
    pending_fulfillment: 'warning',
    fulfilled: 'success',
    rejected: 'danger'
}

/**
 * 获取状态标签颜色类型
 */
const getStatusType = (status: string): TagType =>
    statusTypeMap[status as SubmissionStatus] || 'info'

/**
 * 获取状态标签文案
 */
const getStatusLabel = (status: string) =>
    statusLabelMap[status as SubmissionStatus] || status || '-'

/**
 * 获取支付状态文案
 */
const getPayStatusLabel = (status?: string) => {
    const value = String(status || '').trim()
    if (value === 'paid') return '已支付'
    if (value === 'created') return '待支付'
    if (value === 'closed') return '已关闭'
    if (value === 'free') return '免费'
    return value || '-'
}

/**
 * 获取支付状态标签样式
 */
const getPayStatusType = (status?: string): TagType => {
    const value = String(status || '').trim()
    if (value === 'paid') return 'success'
    if (value === 'created') return 'warning'
    if (value === 'closed') return 'danger'
    if (value === 'free') return 'info'
    return 'info'
}

/**
 * 获取履约状态文案
 */
const getFulfillmentStatusLabel = (status?: string) => {
    const value = String(status || 'pending_review').trim()
    return fulfillmentStatusLabelMap[value] || value || '-'
}

/**
 * 获取履约状态标签样式
 */
const getFulfillmentStatusType = (status?: string): TagType => {
    const value = String(status || 'pending_review').trim()
    return fulfillmentStatusTypeMap[value] || 'info'
}

/**
 * 获取服务类型文案
 */
const getServiceTypeLabel = (row: any) => {
    const serviceType = String(row?.serviceType || '').trim()
    const serviceMeta = row?.serviceMeta || {}
    const addonLabels = Array.isArray(serviceMeta?.addons)
        ? serviceMeta.addons
              .map((item: string) =>
                  item === 'top_recommendation'
                      ? '置顶'
                      : item === 'banner_slot'
                      ? 'Banner'
                      : ''
              )
              .filter(Boolean)
        : []
    if (serviceType === 'top_recommendation' || serviceType === 'paid_boost') return '置顶推荐加购'
    if (serviceType === 'banner_slot') return 'Banner 位加购'
    if (addonLabels.length > 0) return `收录与增值服务（${addonLabels.join('+')}）`
    return serviceMeta?.entryMode === 'commercial_service' ? '收录与增值服务' : '免费网站收录'
}

/**
 * 获取服务类型标签样式
 */
const getServiceTypeTagType = (row: any): TagType => {
    const serviceType = String(row?.serviceType || '').trim()
    const addonList = Array.isArray(row?.serviceMeta?.addons) ? row.serviceMeta.addons : []
    if (serviceType === 'banner_slot' || addonList.includes('banner_slot')) return 'danger'
    if (
        serviceType === 'top_recommendation' ||
        serviceType === 'paid_boost' ||
        addonList.includes('top_recommendation') ||
        row?.serviceMeta?.entryMode === 'commercial_service'
    ) {
        return 'warning'
    }
    return 'success'
}

const formatTime = (ts: number) => (ts ? new Date(ts * 1000).toLocaleString('zh-CN') : '-')

/**
 * 判断付费投稿是否仍未完成支付
 */
const isPaidOrderUnpaid = (row: any) => {
    return Number(row?.payAmount || 0) > 0 && !['paid', 'free'].includes(String(row?.payStatus || ''))
}

/**
 * 格式化分类选项，保留父级 ID 线索便于运营辨认。
 */
const formatCategoryOptionLabel = (item: any) => {
    const parentId = Number(item?.parentId || 0)
    return parentId > 0 ? `${item.name}（父级#${parentId}）` : String(item?.name || '')
}

/**
 * 加载审核分类选项
 */
const loadCategoryOptions = async () => {
    const result = await request.get({ url: '/uied/category/all' })
    const list = Array.isArray(result) ? result : result?.lists || []
    categoryOptions.value = list
        .map((item: any) => ({
            id: Number(item?.id || 0),
            name: String(item?.name || '').trim(),
            parentId: Number(item?.parentId || 0)
        }))
        .filter((item: any) => item.id && item.name)
}

/**
 * 打开站点设置中的投稿与支付配置标签
 */
const handleOpenSubmissionConfig = () => {
    router.push('/system-setting/base-config/setting?tab=submissionService')
}

/**
 * 将补单结果格式化为可读文案
 */
const formatReconcileSummary = (payload: any) => {
    const rows = [
        `扫描订单：${Number(payload?.total || 0)}`,
        `补单成功：${Number(payload?.paid || 0)}`,
        `已关闭：${Number(payload?.closed || 0)}`,
        `仍待支付：${Number(payload?.pending || 0)}`,
        `已跳过：${Number(payload?.skipped || 0)}`,
        `失败：${Number(payload?.failed || 0)}`
    ]
    const details = Array.isArray(payload?.details) ? payload.details.slice(0, 6) : []
    if (details.length > 0) {
        rows.push('')
        rows.push('执行明细：')
        details.forEach((item: any) => {
            const orderNo = String(item?.orderNo || '-')
            const status = String(item?.status || '-')
            const message = String(item?.message || '')
            rows.push(`${orderNo} ｜ ${status} ｜ ${message}`)
        })
    }
    return rows.join('\n')
}

/**
 * 手动触发支付补单
 */
const handleReconcilePayOrders = async (defaultOrderNo = '') => {
    let orderNo = String(defaultOrderNo || '').trim()
    let limit = 20
    if (!orderNo) {
        try {
            const promptRes: any = await feedback.prompt(
                '请输入订单号（可留空，留空将按待支付订单批量补单）',
                '手动补单',
                {
                    inputValue: '',
                    inputPlaceholder: '例如：SUBP202603060001ABC'
                }
            )
            orderNo = String(promptRes?.value || '').trim()
        } catch (error) {
            return
        }
        if (!orderNo) {
            try {
                const limitRes: any = await feedback.prompt(
                    '请输入批量扫描数量（1-100）',
                    '手动补单',
                    {
                        inputValue: '20',
                        inputPattern: /^(100|[1-9]?\d)$/,
                        inputErrorMessage: '请输入 1-100 的整数'
                    }
                )
                limit = Math.max(1, Math.min(100, Number(limitRes?.value || 20)))
            } catch (error) {
                return
            }
        }
    }
    feedback.loading('正在执行补单，请稍候...')
    try {
        const result = await request.post({
            url: '/uied/submission/reconcilePayOrders',
            params: {
                orderNo,
                limit
            }
        })
        feedback.alertSuccess(formatReconcileSummary(result || {}))
        getLists()
    } finally {
        feedback.closeLoading()
    }
}

const handleView = (row: any) => {
    detailData.value = row
    showDetail.value = true
}

/**
 * 打开审核通过弹窗，要求运营明确选择前台分类。
 */
const handleOpenApprove = async (row: any) => {
    if (isPaidOrderUnpaid(row)) {
        feedback.msgWarning('该投稿订单未支付，请先补单或确认支付后再审核')
        return
    }
    currentApproveRow.value = row
    approveForm.categoryId = row.categoryId ? Number(row.categoryId) : undefined
    if (categoryOptions.value.length === 0) {
        await loadCategoryOptions()
    }
    showApprove.value = true
}

/**
 * 确认审核通过并写入分类，后端会再次拦截未支付订单。
 */
const confirmApprove = async () => {
    const row = currentApproveRow.value
    if (!row?.id) {
        feedback.msgWarning('提交记录不存在，请刷新后重试')
        return
    }
    if (!approveForm.categoryId) {
        feedback.msgWarning('请选择审核分类')
        return
    }
    if (isPaidOrderUnpaid(row)) {
        feedback.msgWarning('该投稿订单未支付，请先补单或确认支付后再审核')
        return
    }
    approveLoading.value = true
    try {
        await request.post({
            url: '/uied/submission/approve',
            params: { id: row.id, categoryId: approveForm.categoryId }
        })
        feedback.msgSuccess('审核通过')
        showApprove.value = false
        getLists()
    } finally {
        approveLoading.value = false
    }
}

/**
 * 人工标记履约完成，适用于 Banner 排期或线下服务处理完毕后的收口。
 */
const handleFulfill = async (row: any) => {
    if (isPaidOrderUnpaid(row)) {
        feedback.msgWarning('该投稿订单未支付，不能标记履约')
        return
    }
    let note = '人工确认服务已履约'
    try {
        const promptRes: any = await feedback.prompt('请输入履约备注', '标记履约', {
            inputValue: note,
            inputPlaceholder: '例如：Banner 已排期上线 / 置顶已确认'
        })
        note = String(promptRes?.value || '').trim() || note
    } catch (error) {
        return
    }
    await request.post({ url: '/uied/submission/fulfill', params: { id: row.id, note } })
    feedback.msgSuccess('已标记履约完成')
    getLists()
}

/**
 * 打开拒绝弹窗
 */
const handleReject = (row: any) => {
    currentRejectId.value = row.id
    rejectReason.value = ''
    showReject.value = true
}

/**
 * 确认拒绝提交
 */
const confirmReject = async () => {
    const id = Number(currentRejectId.value || 0)
    const reason = String(rejectReason.value || '').trim()
    if (!id) {
        feedback.msgWarning('提交记录不存在，请刷新后重试')
        return
    }
    if (!reason) {
        feedback.msgWarning('请输入拒绝原因')
        return
    }
    await request.post({
        url: '/uied/submission/reject',
        params: { id, reason }
    })
    feedback.msgSuccess('已拒绝')
    showReject.value = false
    getLists()
}

/**
 * 删除提交记录
 */
const handleDelete = async (id: number) => {
    try {
        await feedback.confirm('确定删除该提交记录吗？')
    } catch (error) {
        return
    }
    await request.post({ url: '/uied/submission/del', params: { id } })
    feedback.msgSuccess('删除成功')
    getLists()
}

loadCategoryOptions().catch(() => {})
getLists()
</script>
