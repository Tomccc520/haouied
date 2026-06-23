<!--
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-20
 */
-->
<template>
    <div class="mcp-list-page">
        <el-card class="!border-none" shadow="never">
            <el-form :model="queryParams" :inline="true" class="mb-[-16px]">
                <el-form-item label="关键词">
                    <el-input
                        v-model="queryParams.keyword"
                        class="w-[220px]"
                        placeholder="名称/摘要/标识"
                        clearable
                        @keyup.enter="resetPage"
                    />
                </el-form-item>
                <el-form-item label="状态">
                    <el-select
                        v-model="queryParams.status"
                        class="w-[140px]"
                        placeholder="全部"
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
                        placeholder="全部"
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
            <div class="mb-4 flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <el-button type="primary" @click="handleCreate">
                        <template #icon><icon name="el-icon-Plus" /></template>
                        发布 MCP
                    </el-button>
                    <el-button @click="getLists">刷新</el-button>
                </div>
                <div class="text-xs text-[#6b7280]">共 {{ pager.count }} 条 MCP</div>
            </div>

            <el-table size="large" v-loading="pager.loading" :data="pager.lists">
                <el-table-column label="ID" prop="id" width="80" />
                <el-table-column label="名称" min-width="220">
                    <template #default="{ row }">
                        <div class="mcp-list-page__title">{{ row.name }}</div>
                        <div class="mcp-list-page__sub">/{{ row.slug }}</div>
                    </template>
                </el-table-column>
                <el-table-column label="分类" min-width="120">
                    <template #default="{ row }">
                        <span>{{ row.categoryName || '-' }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="协议" min-width="160">
                    <template #default="{ row }">
                        <el-tag effect="plain" size="small">{{ row.transportType || '-' }}</el-tag>
                        <el-tag class="ml-2" type="info" effect="plain" size="small">{{
                            row.runtime || '-'
                        }}</el-tag>
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
                <el-table-column label="浏览" prop="viewCount" width="80" />
                <el-table-column label="排序" prop="sortOrder" width="80" />
                <el-table-column label="更新时间" min-width="160">
                    <template #default="{ row }">
                        {{ formatUnixTime(row.updateTime || row.publishTime || row.createTime) }}
                    </template>
                </el-table-column>
                <el-table-column label="操作" width="170" fixed="right">
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
    </div>
</template>

<script lang="ts" setup name="uiedMcpIndex">
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-20
 */
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import feedback from '@/utils/feedback'
import { usePaging } from '@/hooks/usePaging'
import { uiedMcpList, uiedMcpDelete, uiedMcpCategoryAll } from '@/api/uied'

interface McpCategoryOption {
    id: number
    name: string
}

const router = useRouter()

const queryParams = reactive({
    keyword: '',
    status: '',
    categoryId: '' as number | string
})

const categoryOptions = ref<McpCategoryOption[]>([])

const { pager, getLists, resetPage, resetParams } = usePaging({
    fetchFun: uiedMcpList,
    params: queryParams
})

/**
 * 加载分类选项，用于列表筛选。
 */
const loadCategoryOptions = async () => {
    const rows = await uiedMcpCategoryAll({})
    categoryOptions.value = (Array.isArray(rows) ? rows : [])
        .map((item: any) => ({
            id: Number(item.id || 0),
            name: String(item.name || '')
        }))
        .filter((item) => item.id > 0 && item.name)
}

/**
 * 跳转到发布页面创建新 MCP。
 */
const handleCreate = () => {
    router.push('/mcp-center/mcp-publish')
}

/**
 * 跳转到发布页面编辑 MCP。
 */
const handleEdit = (row: any) => {
    const id = Number(row?.id || 0)
    if (!id) return
    router.push(`/mcp-center/mcp-publish?id=${id}`)
}

/**
 * 删除 MCP 条目。
 */
const handleDelete = async (id: number) => {
    const targetId = Number(id || 0)
    if (!targetId) return
    await feedback.confirm('确定删除该 MCP 吗？删除后前台将不可见。')
    await uiedMcpDelete({ id: targetId })
    feedback.msgSuccess('删除成功')
    getLists()
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
.mcp-list-page__title {
    font-weight: 600;
    color: #111827;
}

.mcp-list-page__sub {
    font-size: 12px;
    color: #6b7280;
    margin-top: 2px;
}
</style>
