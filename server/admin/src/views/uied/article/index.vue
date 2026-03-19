<template>
    <div class="article-container">
        <!-- 搜索栏 -->
        <el-card class="!border-none mb-4" shadow="never">
            <el-form :model="queryParams" :inline="true">
                <el-form-item label="关键词">
                    <el-input
                        v-model="queryParams.keyword"
                        placeholder="标题/内容"
                        clearable
                        @keyup.enter="handleQuery"
                    />
                </el-form-item>
                <el-form-item label="状态">
                    <el-select v-model="queryParams.status" placeholder="全部" clearable>
                        <el-option label="草稿" value="draft" />
                        <el-option label="已发布" value="published" />
                    </el-select>
                </el-form-item>
                <el-form-item label="数据范围">
                    <el-select v-model="queryParams.recycleBin" placeholder="全部" @change="handleQuery">
                        <el-option label="正常数据" :value="0" />
                        <el-option label="回收站" :value="1" />
                    </el-select>
                </el-form-item>
                <el-form-item label="分类">
                    <el-select v-model="queryParams.category" placeholder="全部" clearable>
                        <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
                    </el-select>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="handleQuery">查询</el-button>
                    <el-button @click="handleReset">重置</el-button>
                </el-form-item>
            </el-form>
        </el-card>

        <!-- 操作栏 -->
        <el-card class="!border-none mb-4" shadow="never">
            <div class="flex justify-between">
                <div class="flex gap-2">
                    <template v-if="!isRecycleBinMode">
                        <el-button type="primary" @click="handleAdd">
                            <el-icon><Plus /></el-icon>
                            新增文章
                        </el-button>
                        <el-button
                            type="danger"
                            :disabled="!selectedIds.length"
                            @click="handleBatchDelete"
                        >
                            批量删除
                        </el-button>
                    </template>
                    <template v-else>
                        <el-button
                            type="success"
                            :disabled="!selectedIds.length"
                            @click="handleBatchRestore"
                        >
                            批量恢复
                        </el-button>
                        <el-button
                            type="danger"
                            :disabled="!selectedIds.length"
                            @click="handleBatchRealDelete"
                        >
                            彻底删除
                        </el-button>
                    </template>
                </div>
                <div class="flex items-center gap-2">
                    <el-tag v-if="isRecycleBinMode" type="warning" effect="plain">
                        回收站 {{ total }} 条
                    </el-tag>
                    <el-button
                        v-if="!isRecycleBinMode"
                        type="warning"
                        plain
                        @click="switchRecycleBinMode(1)"
                    >
                        进入回收站
                    </el-button>
                    <el-button
                        v-else
                        type="primary"
                        plain
                        @click="switchRecycleBinMode(0)"
                    >
                        返回正常数据
                    </el-button>
                </div>
            </div>
        </el-card>

        <!-- 数据表格 -->
        <el-card class="!border-none" shadow="never">
            <el-table
                v-loading="loading"
                :data="tableData"
                @selection-change="handleSelectionChange"
            >
                <el-table-column type="selection" width="55" />
                <el-table-column label="ID" prop="id" width="80" />
                <el-table-column label="标题" prop="title" min-width="200" show-overflow-tooltip />
                <el-table-column label="分类" prop="category" width="120" />
                <el-table-column label="作者" prop="author" width="100" />
                <el-table-column label="状态" prop="status" width="100">
                    <template #default="{ row }">
                        <el-tag :type="row.status === 'published' ? 'success' : 'info'">
                            {{ row.status === 'published' ? '已发布' : '草稿' }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="浏览量" prop="viewCount" width="100" />
                <el-table-column label="发布时间" width="180">
                    <template #default="{ row }">
                        {{ row.publishedAt ? formatTime(row.publishedAt) : '-' }}
                    </template>
                </el-table-column>
                <el-table-column label="操作" width="190" fixed="right">
                    <template #default="{ row }">
                        <el-button v-if="!isRecycleBinMode" type="primary" link @click="handleEdit(row)">
                            编辑
                        </el-button>
                        <el-button
                            v-if="!isRecycleBinMode"
                            type="danger"
                            link
                            @click="handleDelete(row.id)"
                        >
                            删除
                        </el-button>
                        <el-button
                            v-if="isRecycleBinMode"
                            type="success"
                            link
                            @click="handleRestore(row.id)"
                        >
                            恢复
                        </el-button>
                        <el-button
                            v-if="isRecycleBinMode"
                            type="danger"
                            link
                            @click="handleRealDelete(row.id)"
                        >
                            彻底删除
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>

            <!-- 分页 -->
            <div class="flex justify-end mt-4">
                <el-pagination
                    v-model:current-page="queryParams.page"
                    v-model:page-size="queryParams.pageSize"
                    :total="total"
                    :page-sizes="[10, 20, 50, 100]"
                    layout="total, sizes, prev, pager, next, jumper"
                    @size-change="handleQuery"
                    @current-change="handleQuery"
                />
            </div>
        </el-card>

        <!-- 编辑弹窗 -->
        <el-dialog v-model="dialogVisible" :title="dialogTitle" width="900px" destroy-on-close>
            <el-form ref="formRef" :model="formData" :rules="formRules" label-width="100px">
                <el-form-item label="标题" prop="title">
                    <el-input v-model="formData.title" placeholder="请输入文章标题" />
                </el-form-item>
                <el-form-item label="分类" prop="category">
                    <el-select
                        v-model="formData.category"
                        placeholder="选择分类"
                        allow-create
                        filterable
                    >
                        <el-option v-for="cat in categories" :key="cat" :label="cat" :value="cat" />
                    </el-select>
                </el-form-item>
                <el-form-item label="作者">
                    <el-input v-model="formData.author" placeholder="作者名称" />
                </el-form-item>
                <el-form-item label="关联网址">
                    <el-select
                        v-model="formData.relatedWebsiteIds"
                        multiple
                        filterable
                        remote
                        clearable
                        collapse-tags
                        collapse-tags-tooltip
                        reserve-keyword
                        placeholder="输入关键词搜索网址并绑定（可多选）"
                        :remote-method="searchWebsiteOptions"
                        :loading="websiteSearchLoading"
                        style="width: 100%"
                    >
                        <el-option
                            v-for="site in websiteOptions"
                            :key="site.id"
                            :label="site.name"
                            :value="site.id"
                        >
                            <div class="article-related-site-option">
                                <span class="article-related-site-option__name">{{ site.name }}</span>
                                <span class="article-related-site-option__meta">{{ site.url }}</span>
                            </div>
                        </el-option>
                    </el-select>
                </el-form-item>
                <el-form-item label="封面图">
                    <el-input v-model="formData.coverImage" placeholder="封面图片URL" />
                </el-form-item>
                <el-form-item label="摘要">
                    <el-input
                        v-model="formData.excerpt"
                        type="textarea"
                        :rows="3"
                        placeholder="文章摘要"
                    />
                </el-form-item>
                <el-form-item label="内容" prop="content">
                    <el-input
                        v-model="formData.content"
                        type="textarea"
                        :rows="10"
                        placeholder="Markdown 内容"
                    />
                </el-form-item>
                <el-form-item label="URL标识">
                    <el-input v-model="formData.slug" placeholder="留空自动生成" />
                </el-form-item>
                <el-form-item label="SEO标题">
                    <el-input v-model="formData.seoTitle" placeholder="SEO标题" />
                </el-form-item>
                <el-form-item label="SEO描述">
                    <el-input
                        v-model="formData.seoDescription"
                        type="textarea"
                        :rows="2"
                        placeholder="SEO描述"
                    />
                </el-form-item>
                <el-form-item label="状态">
                    <el-radio-group v-model="formData.status">
                        <el-radio label="draft">草稿</el-radio>
                        <el-radio label="published">发布</el-radio>
                    </el-radio-group>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="dialogVisible = false">取消</el-button>
                <el-button type="primary" :loading="submitLoading" @click="handleSubmit"
                    >确定</el-button
                >
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import request from '@/utils/request'

// 查询参数
const queryParams = reactive({
    page: 1,
    pageSize: 15,
    keyword: '',
    status: '',
    category: '',
    recycleBin: 0
})

// 数据
const loading = ref(false)
const tableData = ref<any[]>([])
const total = ref(0)
const selectedIds = ref<number[]>([])
const categories = ref<string[]>([])
const websiteSearchLoading = ref(false)
const websiteOptions = ref<
    Array<{
        id: number
        name: string
        url: string
        slug?: string
    }>
>([])

// 弹窗
const dialogVisible = ref(false)
const dialogTitle = ref('新增文章')
const submitLoading = ref(false)
const formRef = ref()

// 表单数据
const formData = reactive({
    id: null as number | null,
    title: '',
    content: '',
    excerpt: '',
    coverImage: '',
    author: '管理员',
    category: '',
    slug: '',
    status: 'draft',
    seoTitle: '',
    seoDescription: '',
    relatedWebsiteIds: [] as number[]
})

// 表单验证
const formRules = {
    title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
    content: [{ required: true, message: '请输入内容', trigger: 'blur' }]
}

/**
 * 当前是否处于回收站视图。
 */
const isRecycleBinMode = computed(() => Number(queryParams.recycleBin || 0) === 1)

// 获取列表
const getList = async () => {
    loading.value = true
    try {
        const res = await request.get({ url: '/uied/article/list', params: queryParams })
        tableData.value = res?.lists || []
        total.value = res?.count || 0
    } catch (error) {
        console.error('获取文章列表失败:', error)
    } finally {
        loading.value = false
    }
}

// 获取分类
const getCategories = async () => {
    try {
        const res = await request.get({ url: '/uied/article/categories' })
        categories.value = res || []
    } catch (error) {
        console.error('获取分类失败:', error)
    }
}

// 查询
const handleQuery = () => {
    queryParams.page = 1
    getList()
}

// 重置
const handleReset = () => {
    queryParams.keyword = ''
    queryParams.status = ''
    queryParams.category = ''
    queryParams.recycleBin = 0
    handleQuery()
}

/**
 * 切换列表数据范围（正常/回收站）。
 * @param mode 0=正常数据，1=回收站
 */
const switchRecycleBinMode = (mode: 0 | 1) => {
    queryParams.recycleBin = mode
    handleQuery()
}

// 选择变化
const handleSelectionChange = (selection: any[]) => {
    selectedIds.value = selection.map((item) => item.id)
}

// 新增
const handleAdd = () => {
    dialogTitle.value = '新增文章'
    Object.assign(formData, {
        id: null,
        title: '',
        content: '',
        excerpt: '',
        coverImage: '',
        author: '管理员',
        category: '',
        slug: '',
        status: 'draft',
        seoTitle: '',
        seoDescription: '',
        relatedWebsiteIds: []
    })
    searchWebsiteOptions('')
    dialogVisible.value = true
}

/**
 * 搜索网址选项（用于文章绑定网址）。
 * @param keyword 搜索关键词
 */
const searchWebsiteOptions = async (keyword: string) => {
    websiteSearchLoading.value = true
    try {
        const res = await request.get({
            url: '/uied/website/list',
            params: {
                pageNo: 1,
                pageSize: 20,
                keyword: String(keyword || '').trim(),
                sortBy: 'click_desc'
            }
        })
        const lists = Array.isArray(res?.lists) ? res.lists : []
        websiteOptions.value = lists
            .map((item: any) => ({
                id: Number(item?.id || 0),
                name: String(item?.name || '').trim(),
                url: String(item?.url || '').trim(),
                slug: String(item?.slug || '').trim()
            }))
            .filter((item: any) => item.id > 0 && item.name)
    } catch (error) {
        websiteOptions.value = []
    } finally {
        websiteSearchLoading.value = false
    }
}

// 编辑
const handleEdit = async (row: any) => {
    dialogTitle.value = '编辑文章'
    try {
        const res = await request.get({ url: '/uied/article/detail', params: { id: row.id } })
        if (res) {
            Object.assign(formData, res)
            const idSource = Array.isArray(res.relatedWebsiteIds)
                ? res.relatedWebsiteIds
                : (Array.isArray(res.relatedWebsites) ? res.relatedWebsites.map((site: any) => site?.id) : [])
            formData.relatedWebsiteIds = Array.from(
                new Set(
                    idSource
                        .map((id: any) => Number(id || 0))
                        .filter((id: number) => Number.isInteger(id) && id > 0)
                )
            )
            const detailOptions = (Array.isArray(res.relatedWebsites) ? res.relatedWebsites : [])
                .map((site: any) => ({
                    id: Number(site?.id || 0),
                    name: String(site?.name || '').trim(),
                    url: String(site?.url || '').trim(),
                    slug: String(site?.slug || '').trim()
                }))
                .filter((site: any) => site.id > 0 && site.name)
            if (detailOptions.length > 0) {
                const mergedMap = new Map<number, { id: number; name: string; url: string; slug?: string }>()
                websiteOptions.value.forEach((site) => mergedMap.set(site.id, site))
                detailOptions.forEach((site: any) => mergedMap.set(site.id, site))
                websiteOptions.value = Array.from(mergedMap.values())
            } else {
                searchWebsiteOptions('')
            }
        }
    } catch (error) {
        ElMessage.error('获取文章详情失败')
    }
    dialogVisible.value = true
}

// 提交
const handleSubmit = async () => {
    await formRef.value?.validate()
    submitLoading.value = true
    try {
        const url = formData.id ? '/uied/article/edit' : '/uied/article/add'
        await request.post({ url, params: formData })
        ElMessage.success(formData.id ? '更新成功' : '创建成功')
        dialogVisible.value = false
        getList()
        getCategories()
    } catch (error) {
        ElMessage.error('操作失败')
    } finally {
        submitLoading.value = false
    }
}

// 删除
const handleDelete = async (id: number) => {
    await ElMessageBox.confirm('确定将该文章移入回收站吗？', '提示', { type: 'warning' })
    try {
        await request.post({ url: '/uied/article/del', params: { ids: [id] } })
        ElMessage.success('已移入回收站')
        getList()
    } catch (error) {
        ElMessage.error('删除失败')
    }
}

// 批量删除
const handleBatchDelete = async () => {
    await ElMessageBox.confirm(`确定将选中的 ${selectedIds.value.length} 篇文章移入回收站吗？`, '提示', {
        type: 'warning'
    })
    try {
        await request.post({ url: '/uied/article/del', params: { ids: selectedIds.value } })
        ElMessage.success('已移入回收站')
        selectedIds.value = []
        getList()
    } catch (error) {
        ElMessage.error('删除失败')
    }
}

/**
 * 从回收站恢复单篇文章。
 * @param id 文章ID
 */
const handleRestore = async (id: number) => {
    await ElMessageBox.confirm('确定恢复该文章吗？', '提示', { type: 'warning' })
    try {
        await request.post({ url: '/uied/article/restore', params: { ids: [id] } })
        ElMessage.success('恢复成功')
        getList()
    } catch (error) {
        ElMessage.error('恢复失败')
    }
}

/**
 * 回收站中彻底删除单篇文章。
 * @param id 文章ID
 */
const handleRealDelete = async (id: number) => {
    await ElMessageBox.confirm('确定彻底删除该文章吗？该操作不可恢复。', '提示', { type: 'warning' })
    try {
        await request.post({ url: '/uied/article/realDelete', params: { ids: [id] } })
        ElMessage.success('彻底删除成功')
        getList()
    } catch (error) {
        ElMessage.error('彻底删除失败')
    }
}

/**
 * 批量恢复回收站文章。
 */
const handleBatchRestore = async () => {
    await ElMessageBox.confirm(`确定恢复选中的 ${selectedIds.value.length} 篇文章吗？`, '提示', {
        type: 'warning'
    })
    try {
        await request.post({ url: '/uied/article/restore', params: { ids: selectedIds.value } })
        ElMessage.success('批量恢复成功')
        selectedIds.value = []
        getList()
    } catch (error) {
        ElMessage.error('批量恢复失败')
    }
}

/**
 * 批量彻底删除回收站文章（不可恢复）。
 */
const handleBatchRealDelete = async () => {
    await ElMessageBox.confirm(
        `确定彻底删除选中的 ${selectedIds.value.length} 篇文章吗？该操作不可恢复。`,
        '提示',
        { type: 'warning' }
    )
    try {
        await request.post({ url: '/uied/article/realDelete', params: { ids: selectedIds.value } })
        ElMessage.success('批量彻底删除成功')
        selectedIds.value = []
        getList()
    } catch (error) {
        ElMessage.error('批量彻底删除失败')
    }
}

// 格式化时间
const formatTime = (timestamp: number) => {
    if (!timestamp) return '-'
    const date = new Date(timestamp)
    return date.toLocaleString('zh-CN')
}

onMounted(() => {
    getList()
    getCategories()
    searchWebsiteOptions('')
})
</script>

<style scoped>
.article-container {
    padding: 20px;
}

.article-related-site-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.article-related-site-option__name {
    font-size: 13px;
    color: #1f2937;
}

.article-related-site-option__meta {
    font-size: 12px;
    color: #94a3b8;
    max-width: 380px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
</style>
