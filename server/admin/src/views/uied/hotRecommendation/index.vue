<!--
 * @file views/uied/hotRecommendation/index.vue
 * @description UIED 热门推荐管理
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
-->
<template>
    <div class="hot-recommendation-lists">
        <el-card class="!border-none" shadow="never">
            <el-form class="mb-[-16px]" :model="queryParams" :inline="true">
                <el-form-item label="推荐搜索">
                    <el-input
                        v-model="queryParams.keyword"
                        class="w-[280px]"
                        placeholder="搜索网站名称/链接/描述/推荐ID"
                        clearable
                        @keyup.enter="resetPage"
                        @clear="resetPage"
                    />
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="resetPage">查询</el-button>
                    <el-button @click="handleResetSearch">重置</el-button>
                </el-form-item>
            </el-form>
        </el-card>

        <el-card class="!border-none mt-4" shadow="never">
            <div class="mb-4 flex justify-between">
                <el-button type="primary" @click="handleAdd">
                    <template #icon><icon name="el-icon-Plus" /></template>
                    添加推荐
                </el-button>
                <div class="text-gray-400">共 {{ pager.count }} 条推荐</div>
            </div>
            <el-table size="large" v-loading="pager.loading" :data="pager.lists">
                <el-table-column label="ID" prop="id" width="80" />
                <el-table-column label="网站" min-width="200">
                    <template #default="{ row }">
                        <div class="flex items-center gap-2">
                            <el-avatar
                                v-if="row.iconUrl || row.websiteIcon"
                                :src="row.iconUrl || row.websiteIcon"
                                :size="24"
                                shape="square"
                            />
                            <span>{{ row.name || row.websiteName || row.title }}</span>
                        </div>
                    </template>
                </el-table-column>
                <el-table-column label="链接" prop="url" min-width="200" show-overflow-tooltip>
                    <template #default="{ row }">
                        <a :href="row.url || row.websiteUrl" target="_blank" class="text-primary">{{
                            row.url || row.websiteUrl
                        }}</a>
                    </template>
                </el-table-column>
                <el-table-column label="位置" prop="position" width="100" />
                <el-table-column label="排序" prop="sortOrder" width="80" />
                <el-table-column label="投放时间" min-width="220">
                    <template #default="{ row }">
                        <div class="text-xs leading-6">
                            <div>开始：{{ formatScheduleTime(row.startTime) }}</div>
                            <div>结束：{{ formatScheduleTime(row.endTime) }}</div>
                        </div>
                    </template>
                </el-table-column>
                <el-table-column label="状态" width="80">
                    <template #default="{ row }">
                        <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
                            {{ row.isActive ? '显示' : '隐藏' }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="投放状态" width="100">
                    <template #default="{ row }">
                        <el-tag :type="getScheduleStatusType(row.scheduleStatus)" size="small">
                            {{ getScheduleStatusLabel(row.scheduleStatus) }}
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
        <el-dialog v-model="showEdit" :title="editData.id ? '编辑推荐' : '添加推荐'" width="500px">
            <el-form ref="editFormRef" :model="editData" :rules="editRules" label-width="80px">
                <el-form-item label="选择网站" prop="websiteId">
                    <el-select
                        v-model="editData.websiteId"
                        filterable
                        remote
                        clearable
                        reserve-keyword
                        style="width: 100%"
                        placeholder="输入关键词搜索网站（来自网站管理）"
                        :remote-method="handleWebsiteRemoteSearch"
                        :loading="websiteSearchLoading"
                        @change="handleWebsiteSelect"
                        @focus="handleWebsiteSelectFocus"
                    >
                        <el-option
                            v-for="item in websiteOptions"
                            :key="item.id"
                            :label="`${item.name}（${item.url}）`"
                            :value="item.id"
                        />
                    </el-select>
                    <div class="text-xs text-tx-secondary mt-1">
                        展示时实时读取“网站管理”的最新名称和链接；如需更换推荐对象，请重新选择网站。
                    </div>
                </el-form-item>
                <el-form-item label="网站名称" prop="name">
                    <el-input v-model="editData.name" placeholder="将由上方自动填充" disabled />
                </el-form-item>
                <el-form-item label="网站链接" prop="url">
                    <el-input v-model="editData.url" placeholder="将由上方自动填充" disabled />
                </el-form-item>
                <el-form-item label="图标URL">
                    <el-input
                        v-model="editData.iconUrl"
                        placeholder="优先使用网站库图标，可按需覆盖"
                    />
                </el-form-item>
                <el-form-item label="描述">
                    <el-input
                        v-model="editData.description"
                        type="textarea"
                        :rows="2"
                        placeholder="请输入描述（可选）"
                    />
                </el-form-item>
                <el-form-item label="位置">
                    <el-select v-model="editData.position" style="width: 100%">
                        <el-option label="热门推荐" value="hot" />
                        <el-option label="侧边栏" value="sidebar" />
                        <el-option label="首页" value="home" />
                        <el-option label="底部" value="footer" />
                    </el-select>
                </el-form-item>
                <el-form-item label="开始时间">
                    <el-date-picker
                        v-model="editData.startTime"
                        type="datetime"
                        clearable
                        value-format="X"
                        placeholder="不填则立即生效"
                        style="width: 100%"
                    />
                </el-form-item>
                <el-form-item label="结束时间">
                    <el-date-picker
                        v-model="editData.endTime"
                        type="datetime"
                        clearable
                        value-format="X"
                        placeholder="不填则长期投放"
                        style="width: 100%"
                    />
                    <div class="text-xs text-tx-secondary mt-1">
                        适合控制广告/推荐位投放周期。结束时间早于开始时间将禁止保存。
                    </div>
                </el-form-item>
                <el-form-item label="排序">
                    <el-input-number v-model="editData.sortOrder" :min="0" />
                </el-form-item>
                <el-form-item label="状态">
                    <el-switch v-model="editData.isShow" active-text="显示" inactive-text="隐藏" />
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

<script lang="ts" setup name="uiedHotRecommendation">
import {
    uiedHotRecommendationList,
    uiedHotRecommendationAdd,
    uiedHotRecommendationEdit,
    uiedHotRecommendationDelete,
    uiedWebsiteSearch,
    uiedWebsiteList
} from '@/api/uied'
import { usePaging } from '@/hooks/usePaging'
import { timeFormat } from '@/utils/util'
import feedback from '@/utils/feedback'
import type { FormInstance, FormRules } from 'element-plus'

const queryParams = reactive({
    keyword: ''
})

const { pager, getLists, resetPage } = usePaging({
    fetchFun: uiedHotRecommendationList,
    params: queryParams
})

interface WebsiteOption {
    id: number
    name: string
    url: string
    iconUrl: string
    description: string
}

const showEdit = ref(false)
const editLoading = ref(false)
const editFormRef = ref<FormInstance>()
const websiteOptions = ref<WebsiteOption[]>([])
const websiteSearchLoading = ref(false)
const websiteSearchSequence = ref(0)
const editData = reactive({
    id: 0,
    websiteId: '' as number | string,
    name: '',
    url: '',
    iconUrl: '',
    description: '',
    position: 'hot',
    startTime: '' as number | string,
    endTime: '' as number | string,
    sortOrder: 0,
    isShow: true
})
const editRules: FormRules = {
    websiteId: [
        {
            validator: (_rule, value, callback) => {
                if (editData.id) {
                    callback()
                    return
                }
                if (!value) {
                    callback(new Error('请选择网站'))
                    return
                }
                callback()
            },
            trigger: 'change'
        }
    ],
    name: [{ required: true, message: '请先选择网站', trigger: 'change' }],
    url: [{ required: true, message: '请先选择网站', trigger: 'change' }]
}

/**
 * 合并网站下拉选项，避免重复项覆盖用户当前选择。
 */
const mergeWebsiteOptions = (rows: WebsiteOption[]) => {
    const map = new Map<number, WebsiteOption>()
    ;[...(websiteOptions.value || []), ...(Array.isArray(rows) ? rows : [])].forEach((item) => {
        if (!item || !Number(item.id)) return
        map.set(Number(item.id), item)
    })
    websiteOptions.value = Array.from(map.values())
}

/**
 * 直接替换下拉候选，避免历史结果持续堆积导致“搜索没效果”。
 * 为了保证编辑态稳定，会保留当前已选项。
 */
const replaceWebsiteOptions = (rows: WebsiteOption[]) => {
    const selectedId = Number(editData.websiteId || 0)
    const selectedFromCurrent = websiteOptions.value.find((item) => Number(item.id) === selectedId)
    const map = new Map<number, WebsiteOption>()
    ;(Array.isArray(rows) ? rows : []).forEach((item) => {
        if (!item || !Number(item.id)) return
        map.set(Number(item.id), item)
    })
    if (selectedFromCurrent && !map.has(Number(selectedFromCurrent.id))) {
        map.set(Number(selectedFromCurrent.id), selectedFromCurrent)
    }
    websiteOptions.value = Array.from(map.values())
}

/**
 * 加载默认网站选项（无关键词时兜底），避免下拉空白。
 */
const loadDefaultWebsiteOptions = async () => {
    const currentSeq = ++websiteSearchSequence.value
    websiteSearchLoading.value = true
    try {
        const res = await uiedWebsiteList({
            pageNo: 1,
            pageSize: 40,
            sortBy: 'update_desc'
        })
        const rows = Array.isArray(res?.lists) ? res.lists : []
        const options: WebsiteOption[] = rows
            .map((item: any) => ({
                id: Number(item?.id || 0),
                name: String(item?.name || '').trim(),
                url: String(item?.url || '').trim(),
                iconUrl: String(item?.iconUrl || '').trim(),
                description: String(item?.description || '').trim()
            }))
            .filter((item: WebsiteOption) => item.id > 0 && item.name && item.url)
        if (currentSeq !== websiteSearchSequence.value) return
        replaceWebsiteOptions(options)
    } catch (error) {
        console.error('加载默认网站列表失败:', error)
    } finally {
        if (currentSeq === websiteSearchSequence.value) {
            websiteSearchLoading.value = false
        }
    }
}

/**
 * 通过关键词远程搜索网站列表，供热门推荐选择。
 */
const handleWebsiteRemoteSearch = async (keyword: string) => {
    const normalizedKeyword = String(keyword || '').trim()
    if (!normalizedKeyword) {
        await loadDefaultWebsiteOptions()
        return
    }
    const currentSeq = ++websiteSearchSequence.value
    websiteSearchLoading.value = true
    try {
        const res = await uiedWebsiteSearch({
            keyword: normalizedKeyword,
            pageSize: 60,
            pageNo: 1
        })
        const rows = Array.isArray(res?.lists) ? res.lists : []
        const options: WebsiteOption[] = rows
            .map((item: any) => ({
                id: Number(item?.id || 0),
                name: String(item?.name || '').trim(),
                url: String(item?.url || '').trim(),
                iconUrl: String(item?.iconUrl || '').trim(),
                description: String(item?.description || '').trim()
            }))
            .filter((item: WebsiteOption) => item.id > 0 && item.name && item.url)
        if (currentSeq !== websiteSearchSequence.value) return
        replaceWebsiteOptions(options)
    } catch (error) {
        console.error('搜索网站失败:', error)
    } finally {
        if (currentSeq === websiteSearchSequence.value) {
            websiteSearchLoading.value = false
        }
    }
}

/**
 * 选择器聚焦时预载一批网站，提升“直接点击选择”体验。
 */
const handleWebsiteSelectFocus = () => {
    if (websiteSearchLoading.value) return
    if (Array.isArray(websiteOptions.value) && websiteOptions.value.length > 0) return
    loadDefaultWebsiteOptions()
}

/**
 * 根据选择的网站回填推荐表单字段。
 */
const handleWebsiteSelect = (websiteId: number | string) => {
    const currentId = Number(websiteId || 0)
    if (!Number.isInteger(currentId) || currentId <= 0) {
        if (!editData.id) {
            editData.name = ''
            editData.url = ''
            editData.iconUrl = ''
            editData.description = ''
        }
        return
    }
    const matched = websiteOptions.value.find((item) => Number(item.id) === currentId)
    if (!matched) return
    editData.websiteId = matched.id
    editData.name = matched.name
    editData.url = matched.url
    editData.iconUrl = matched.iconUrl
    if (!String(editData.description || '').trim()) {
        editData.description = matched.description
    }
}

/**
 * 编辑态按现有 URL 反查网站库，尽量自动绑定 websiteId。
 */
const tryHydrateWebsiteSelectionForEdit = async (row: any) => {
    const rawWebsiteId = Number(row?.websiteId || 0)
    if (rawWebsiteId > 0) {
        const option: WebsiteOption = {
            id: rawWebsiteId,
            name: String(row?.name || row?.websiteName || row?.title || '').trim(),
            url: String(row?.url || row?.websiteUrl || '').trim(),
            iconUrl: String(row?.iconUrl || row?.websiteIcon || '').trim(),
            description: String(row?.description || '').trim()
        }
        mergeWebsiteOptions([option])
        editData.websiteId = rawWebsiteId
        return
    }
    const url = String(row?.url || row?.websiteUrl || '').trim()
    const name = String(row?.name || row?.websiteName || row?.title || '').trim()
    const keyword = name || url
    if (!keyword) return
    await handleWebsiteRemoteSearch(keyword)
    const matchedByUrl = websiteOptions.value.find((item) => item.url === url)
    if (matchedByUrl) {
        handleWebsiteSelect(matchedByUrl.id)
    }
}

const resetEditData = () =>
    Object.assign(editData, {
        id: 0,
        websiteId: '',
        name: '',
        url: '',
        iconUrl: '',
        description: '',
        position: 'hot',
        startTime: '',
        endTime: '',
        sortOrder: 0,
        isShow: true
    })

const handleAdd = () => {
    resetEditData()
    websiteOptions.value = []
    loadDefaultWebsiteOptions()
    showEdit.value = true
}
const handleEdit = async (row: any) => {
    Object.assign(editData, {
        id: row.id,
        websiteId: Number(row?.websiteId || 0) || '',
        name: row.name || row.websiteName || row.title || '',
        url: row.url || row.websiteUrl || '',
        iconUrl: row.iconUrl || row.websiteIcon || '',
        description: row.description || '',
        position: row.position || 'hot',
        startTime: Number(row?.startTime || 0) || '',
        endTime: Number(row?.endTime || 0) || '',
        sortOrder: row.sortOrder || 0,
        isShow: row.isActive !== false && row.isShow !== false
    })
    websiteOptions.value = []
    await tryHydrateWebsiteSelectionForEdit(row)
    showEdit.value = true
}

const handleSubmit = async () => {
    await editFormRef.value?.validate()
    const startTime = Number(editData.startTime || 0)
    const endTime = Number(editData.endTime || 0)
    if (startTime > 0 && endTime > 0 && endTime < startTime) {
        feedback.msgError('结束时间不能早于开始时间')
        return
    }
    editLoading.value = true
    try {
        const submitData = {
            ...editData,
            startTime,
            endTime
        }
        if (editData.id) {
            await uiedHotRecommendationEdit(submitData)
            feedback.msgSuccess('编辑成功')
        } else {
            await uiedHotRecommendationAdd(submitData)
            feedback.msgSuccess('添加成功')
        }
        showEdit.value = false
        getLists()
    } finally {
        editLoading.value = false
    }
}

const handleDelete = async (id: number) => {
    await feedback.confirm('确定要删除该推荐吗？')
    await uiedHotRecommendationDelete({ id })
    feedback.msgSuccess('删除成功')
    getLists()
}

/**
 * 重置热门推荐搜索条件并返回第一页。
 */
const handleResetSearch = () => {
    queryParams.keyword = ''
    resetPage()
}

/**
 * 格式化投放时间显示
 * @param value 秒级时间戳
 */
const formatScheduleTime = (value: unknown) => {
    const timestamp = Number(value || 0)
    if (!Number.isFinite(timestamp) || timestamp <= 0) return '不限'
    return timeFormat(timestamp, 'yyyy-mm-dd hh:MM:ss')
}

/**
 * 获取投放状态文案
 * @param status 投放状态
 */
const getScheduleStatusLabel = (status: unknown) => {
    switch (String(status || '')) {
        case 'pending':
            return '未开始'
        case 'expired':
            return '已结束'
        case 'hidden':
            return '已隐藏'
        default:
            return '投放中'
    }
}

/**
 * 获取投放状态标签类型
 * @param status 投放状态
 */
const getScheduleStatusType = (status: unknown): 'warning' | 'danger' | 'info' | 'success' => {
    switch (String(status || '')) {
        case 'pending':
            return 'warning'
        case 'expired':
            return 'danger'
        case 'hidden':
            return 'info'
        default:
            return 'success'
    }
}

getLists()
</script>
