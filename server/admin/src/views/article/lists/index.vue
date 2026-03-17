<!--
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-02-16
 */
-->
<template>
    <div class="article-lists">
        <el-card class="!border-none" shadow="never">
            <el-form ref="formRef" class="mb-[-16px]" :model="queryParams" :inline="true">
                <el-form-item label="文章标题">
                    <el-input
                        class="w-[280px]"
                        v-model="queryParams.title"
                        placeholder="输入标题关键词"
                        clearable
                        @keyup.enter="resetPage"
                        @clear="resetPage"
                    />
                </el-form-item>
                <el-form-item label="栏目名称">
                    <el-select
                        class="w-[280px]"
                        v-model="queryParams.cid"
                        clearable
                        filterable
                        @change="handleSearchFieldChange"
                    >
                        <el-option label="全部" value />
                        <el-option
                            v-for="item in optionsData.articleCate"
                            :key="item.id"
                            :label="item.name"
                            :value="item.id"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item label="发布状态">
                    <el-select
                        class="w-[220px]"
                        v-model="queryParams.isShow"
                        clearable
                        @change="handleSearchFieldChange"
                    >
                        <el-option label="全部" value />
                        <el-option label="已发布" :value="1" />
                        <el-option label="待发布" :value="0" />
                    </el-select>
                </el-form-item>
                <el-form-item label="审核状态">
                    <el-select
                        class="w-[220px]"
                        v-model="queryParams.reviewStatus"
                        clearable
                        @change="handleSearchFieldChange"
                    >
                        <el-option label="全部" value />
                        <el-option label="待审核" :value="1" />
                        <el-option label="已通过" :value="2" />
                        <el-option label="已驳回" :value="3" />
                        <el-option label="需修改" :value="4" />
                    </el-select>
                </el-form-item>
                <el-form-item label="文章标签">
                    <el-select
                        class="w-[280px]"
                        v-model="queryParams.tagId"
                        clearable
                        filterable
                        @change="handleSearchFieldChange"
                    >
                        <el-option label="全部" value />
                        <el-option
                            v-for="item in optionsData.articleTag"
                            :key="item.id"
                            :label="item.name"
                            :value="item.id"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item label="所属专题">
                    <el-select
                        class="w-[280px]"
                        v-model="queryParams.topicId"
                        clearable
                        filterable
                        @change="handleSearchFieldChange"
                    >
                        <el-option label="全部" value />
                        <el-option
                            v-for="item in optionsData.articleTopic"
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
            <div>
                <el-button
                    v-perms="['article:add', 'article:add/edit']"
                    type="primary"
                    class="mb-4"
                    @click="handleCreate"
                >
                    <template #icon>
                        <icon name="el-icon-Plus" />
                    </template>
                    发布文章
                </el-button>
                <el-button
                    v-perms="['article:add', 'article:add/edit']"
                    class="mb-4 ml-2"
                    :loading="seedLoading"
                    @click="handleSeedTestData"
                >
                    生成测试数据
                </el-button>
                <el-button
                    v-perms="['article:add', 'article:add/edit']"
                    class="mb-4 ml-2"
                    :disabled="batchWechatImportLoading"
                    @click="openBatchWechatImportDialog"
                >
                    批量导入文章
                </el-button>
            </div>
            <div class="article-summary mb-3">
                <el-tag effect="plain">当前列表 {{ safeLists.length }} 条</el-tag>
                <el-tag type="warning" effect="plain">待审核 {{ pageAuditPendingCount }} 条</el-tag>
                <el-tag type="success" effect="plain">已发布 {{ pagePublishedCount }} 条</el-tag>
                <el-tag type="info" effect="plain">待发布 {{ pageDraftCount }} 条</el-tag>
            </div>
            <div class="article-quick-filters mb-3">
                <span class="article-quick-filters__label">快捷筛选</span>
                <el-button size="small" @click="applyQuickFilter('all')">全部</el-button>
                <el-button
                    size="small"
                    type="warning"
                    plain
                    @click="applyQuickFilter('pendingReview')"
                >
                    待审核
                </el-button>
                <el-button size="small" type="success" plain @click="applyQuickFilter('published')">
                    已发布
                </el-button>
                <el-button size="small" type="info" plain @click="applyQuickFilter('draft')">
                    待发布
                </el-button>
            </div>

            <el-dialog
                v-model="batchWechatImportDialogVisible"
                title="批量导入公众号文章"
                width="860px"
                :close-on-click-modal="!batchWechatImportLoading"
                destroy-on-close
            >
                <div
                    v-loading="batchWechatImportLoading"
                    element-loading-text="正在批量导入文章，请稍候..."
                >
                    <el-form :model="batchWechatImportForm" label-width="120px">
                        <el-form-item label="文章栏目" required>
                            <el-select
                                v-model="batchWechatImportForm.cid"
                                placeholder="请选择栏目"
                                filterable
                                clearable
                                style="width: 100%"
                                :disabled="batchWechatImportLoading"
                            >
                                <el-option
                                    v-for="item in optionsData.articleCate"
                                    :key="item.id"
                                    :label="item.name"
                                    :value="item.id"
                                />
                            </el-select>
                        </el-form-item>
                        <el-form-item label="作者" required>
                            <el-select
                                v-model="batchWechatImportForm.author"
                                placeholder="请选择作者（支持输入搜索）"
                                filterable
                                remote
                                clearable
                                :remote-method="fetchBatchImportAuthorOptions"
                                @visible-change="handleBatchImportAuthorVisibleChange"
                                :loading="batchWechatImportAuthorLoading"
                                style="width: 100%"
                                :disabled="batchWechatImportLoading"
                            >
                                <el-option
                                    v-for="item in batchWechatImportAuthorOptions"
                                    :key="item.value"
                                    :label="item.label"
                                    :value="item.value"
                                >
                                    <div class="flex items-center justify-between gap-2">
                                        <span>{{ item.label }}</span>
                                        <span class="text-xs text-gray-400">{{ item.userTypeName }}</span>
                                    </div>
                                </el-option>
                            </el-select>
                        </el-form-item>
                        <el-form-item label="公众号链接" required>
                            <el-input
                                v-model="batchWechatImportForm.urlsText"
                                type="textarea"
                                :rows="8"
                                placeholder="每行一个公众号链接（https://mp.weixin.qq.com/...)"
                                :disabled="batchWechatImportLoading"
                            />
                        </el-form-item>
                        <el-form-item label="发布状态">
                            <el-radio-group
                                v-model="batchWechatImportForm.status"
                                :disabled="batchWechatImportLoading"
                            >
                                <el-radio-button label="draft">草稿</el-radio-button>
                                <el-radio-button label="published">发布</el-radio-button>
                            </el-radio-group>
                        </el-form-item>
                        <el-form-item label="导入选项">
                            <el-checkbox
                                v-model="batchWechatImportForm.aiEnabled"
                                :disabled="batchWechatImportLoading"
                            >
                                导入后使用 AI 润色正文
                            </el-checkbox>
                            <div
                                v-if="batchWechatImportForm.aiEnabled"
                                class="text-xs text-gray-500 mt-2"
                            >
                                模型与提示词请在「AI 助手管理 -> 导入配置」中统一设置。
                            </div>
                        </el-form-item>
                    </el-form>

                    <el-alert
                        v-if="batchWechatImportResult"
                        class="mt-2"
                        type="info"
                        :closable="false"
                        :title="`导入结果：新增 ${batchWechatImportResult.created} 条，失败 ${batchWechatImportResult.failed} 条`"
                    />
                    <el-table
                        v-if="batchWechatImportResult && batchWechatImportResult.rows.length > 0"
                        :data="batchWechatImportResult.rows"
                        size="small"
                        max-height="300"
                        class="mt-3"
                    >
                        <el-table-column type="index" label="#" width="56" />
                        <el-table-column label="状态" width="88">
                            <template #default="{ row }">
                                <el-tag :type="row.status === 'created' ? 'success' : 'danger'" size="small">
                                    {{ row.status === 'created' ? '成功' : '失败' }}
                                </el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="链接" min-width="260" show-overflow-tooltip>
                            <template #default="{ row }">{{ row.url || '-' }}</template>
                        </el-table-column>
                        <el-table-column label="文章ID" width="96">
                            <template #default="{ row }">{{ row.articleId || '-' }}</template>
                        </el-table-column>
                        <el-table-column label="标题" min-width="180" show-overflow-tooltip>
                            <template #default="{ row }">{{ row.title || '-' }}</template>
                        </el-table-column>
                        <el-table-column label="说明" min-width="240" show-overflow-tooltip>
                            <template #default="{ row }">{{ row.reason || '-' }}</template>
                        </el-table-column>
                    </el-table>
                </div>
                <template #footer>
                    <el-button :disabled="batchWechatImportLoading" @click="batchWechatImportDialogVisible = false">
                        取消
                    </el-button>
                    <el-button
                        type="primary"
                        :loading="batchWechatImportLoading"
                        :disabled="batchWechatImportLoading"
                        @click="handleBatchWechatImportSubmit"
                    >
                        开始导入
                    </el-button>
                </template>
            </el-dialog>

            <el-table size="large" stripe v-loading="pager.loading" :data="safeLists">
                <el-table-column label="ID" prop="id" min-width="80" />
                <el-table-column label="封面" min-width="100">
                    <template #default="{ row }">
                        <image-contain
                            v-if="row.image"
                            :src="row.image"
                            :width="60"
                            :height="45"
                            :preview-src-list="[row.image]"
                            preview-teleported
                            fit="contain"
                        />
                    </template>
                </el-table-column>
                <el-table-column
                    label="标题"
                    prop="title"
                    min-width="160"
                    show-tooltip-when-overflow
                />
                <el-table-column label="栏目" prop="category" min-width="100" />
                <el-table-column label="标签" min-width="160">
                    <template #default="{ row }">
                        <el-space wrap>
                            <el-tag
                                v-for="tag in row.tags || []"
                                :key="tag"
                                size="small"
                                effect="plain"
                            >
                                {{ tag }}
                            </el-tag>
                            <span v-if="!row.tags || row.tags.length === 0" class="text-info"
                                >-</span
                            >
                        </el-space>
                    </template>
                </el-table-column>
                <el-table-column label="专题" prop="topic" min-width="120" />
                <el-table-column label="作者" prop="author" min-width="120" />
                <el-table-column label="浏览量" prop="visit" min-width="100" />
                <el-table-column label="收藏数" prop="collectCount" min-width="100" />
                <el-table-column label="点赞数" prop="likeCount" min-width="100" />
                <el-table-column label="发布状态" min-width="120">
                    <template #default="{ row }">
                        <el-tag v-if="Number(row.isShow) === 1" type="success">已发布</el-tag>
                        <el-tag v-else type="info">待发布</el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="审核状态" min-width="120">
                    <template #default="{ row }">
                        <el-tag :type="getReviewTagType(row.reviewStatus)">
                            {{ row.reviewStatusName || '-' }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="审核备注" min-width="180" show-overflow-tooltip>
                    <template #default="{ row }">
                        <span>{{ row.reviewRemark || '-' }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="排序" prop="sort" min-width="100" />
                <el-table-column label="发布时间" prop="createTime" min-width="120" />
                <el-table-column label="操作" width="180" fixed="right">
                    <template #default="{ row }">
                        <div class="article-actions">
                            <el-tooltip
                                content="审核通过并发布"
                                placement="top"
                                v-if="Number(row.reviewStatus) === 1 && Number(row.isShow) !== 1"
                            >
                                <el-button
                                    v-perms="['article:change']"
                                    type="success"
                                    link
                                    :icon="Select"
                                    @click="handleAuditPass(row)"
                                />
                            </el-tooltip>

                            <el-tooltip
                                :content="
                                    Number(row.isShow) === 1
                                        ? '前台查看'
                                        : '待发布文章暂不可在前台查看'
                                "
                                placement="top"
                            >
                                <el-button
                                    type="primary"
                                    link
                                    :icon="View"
                                    :disabled="Number(row.isShow) !== 1"
                                    @click="handleView(row)"
                                />
                            </el-tooltip>

                            <el-tooltip content="编辑" placement="top">
                                <el-button
                                    v-perms="['article:edit', 'article:add/edit']"
                                    type="primary"
                                    link
                                    :icon="EditPen"
                                    @click="handleEdit(row)"
                                />
                            </el-tooltip>

                            <el-tooltip
                                :content="Number(row.isShow) === 1 ? '转为待发布' : '发表'"
                                placement="top"
                            >
                                <el-button
                                    v-perms="['article:change']"
                                    type="primary"
                                    link
                                    :icon="Number(row.isShow) === 1 ? Document : Promotion"
                                    @click="togglePublish(row)"
                                />
                            </el-tooltip>

                            <el-tooltip content="删除" placement="top">
                                <el-button
                                    v-perms="['article:del']"
                                    type="danger"
                                    link
                                    :icon="Delete"
                                    @click="handleDelete(row.id)"
                                />
                            </el-tooltip>
                        </div>
                    </template>
                </el-table-column>
            </el-table>
            <div class="flex justify-end mt-4">
                <pagination v-model="pager" @change="getLists" />
            </div>
        </el-card>
    </div>
</template>
<script lang="ts" setup name="articleLists">
import { Delete, Document, EditPen, Promotion, Select, View } from '@element-plus/icons-vue'
import {
    articleLists,
    articleDelete,
    articleStatus,
    articleFrontAudit,
    articleSeedTestData,
    articleImportWechatBatch,
    articleCateAll,
    articleTagAll,
    articleTopicAll
} from '@/api/article'
import { getAuthorUserOptions } from '@/api/consumer'
import { useDictOptions } from '@/hooks/useDictOptions'
import { usePaging } from '@/hooks/usePaging'
import { getRoutePath } from '@/router'
import feedback from '@/utils/feedback'

interface ArticleOptionItem {
    id: number
    name: string
}

interface ArticleListItem {
    id: number
    image?: string
    title?: string
    slug?: string
    category?: string
    author?: string
    visit?: number
    collectCount?: number
    likeCount?: number
    sort?: number
    createTime?: string
    isShow?: number | string
    reviewStatus?: number | string
    reviewStatusName?: string
    reviewRemark?: string
    tags?: string[]
    topic?: string
}

interface AuthorOptionItem {
    value: string
    label: string
    userTypeName: string
}

interface BatchWechatImportResultRow {
    status: string
    url: string
    articleId?: number
    title?: string
    reason?: string
}

const queryParams = reactive({
    title: '',
    cid: '',
    isShow: '',
    reviewStatus: '',
    tagId: '',
    topicId: ''
})
const router = useRouter()
const seedLoading = ref(false)
const batchWechatImportDialogVisible = ref(false)
const batchWechatImportLoading = ref(false)
const batchWechatImportAuthorKeyword = ref('')
const batchWechatImportAuthorLoading = ref(false)
const batchWechatImportAuthorOptions = ref<AuthorOptionItem[]>([])
const batchWechatImportResult = ref<{
    created: number
    failed: number
    rows: BatchWechatImportResultRow[]
} | null>(null)
const batchWechatImportForm = reactive({
    cid: '' as number | string,
    author: '',
    urlsText: '',
    status: 'draft',
    aiEnabled: false
})
const frontendUrl = (import.meta.env.VITE_FRONTEND_URL || 'http://localhost:3003').replace(
    /\/$/,
    ''
)
/**
 * 规范化前台路由路径，确保始终为「/xxx」格式
 */
const normalizeFrontendRoutePath = (rawPath: string, fallbackPath = '/articles') => {
    const source = String(rawPath || '').trim() || String(fallbackPath || '').trim()
    const normalized = source.replace(/^\/+|\/+$/g, '')
    return normalized ? `/${normalized}` : '/'
}
const frontendArticleDetailPath = normalizeFrontendRoutePath(
    import.meta.env.VITE_FRONTEND_ARTICLE_DETAIL_PATH || '/article',
    '/article'
)

/**
 * 统一获取前台文章详情路径，优先兼容固定链接「/article/:slug」
 */
const resolveFrontendArticleDetailPath = () => {
    if (frontendArticleDetailPath === '/articles') {
        return '/article'
    }
    return frontendArticleDetailPath
}

const { pager, getLists, resetPage, resetParams } = usePaging({
    fetchFun: articleLists,
    params: queryParams
})

/**
 * 统一处理搜索筛选项变更，减少重复点击查询按钮
 */
const handleSearchFieldChange = () => {
    resetPage()
}

const { optionsData } = useDictOptions<{
    articleCate: ArticleOptionItem[]
    articleTag: ArticleOptionItem[]
    articleTopic: ArticleOptionItem[]
}>({
    articleCate: {
        api: articleCateAll
    },
    articleTag: {
        api: articleTagAll
    },
    articleTopic: {
        api: articleTopicAll
    }
})

/**
 * 拉取“批量导入文章”作者选项（支持关键词搜索）。
 */
const fetchBatchImportAuthorOptions = async (keyword = '') => {
    batchWechatImportAuthorKeyword.value = String(keyword || '')
    batchWechatImportAuthorLoading.value = true
    try {
        const data: any = await getAuthorUserOptions({
            keyword: batchWechatImportAuthorKeyword.value,
            pageSize: 30
        })
        batchWechatImportAuthorOptions.value = Array.isArray(data)
            ? data.map((item: any) => ({
                  value: String(item?.value || item?.id || ''),
                  label: String(item?.label || ''),
                  userTypeName: String(item?.userTypeName || '普通用户')
              }))
            : []
    } catch (error) {
        batchWechatImportAuthorOptions.value = []
    } finally {
        batchWechatImportAuthorLoading.value = false
    }
}

/**
 * 作者下拉展开时初始化数据，避免首开空列表。
 */
const handleBatchImportAuthorVisibleChange = (visible: boolean) => {
    if (!visible) return
    fetchBatchImportAuthorOptions(batchWechatImportAuthorKeyword.value)
}

/**
 * 解析文章编辑路由，优先使用动态菜单路由，缺失时使用兜底路径
 */
const resolveEditPath = () => {
    const routePaths = new Set(router.getRoutes().map((item) => item.path))
    const dynamicPath = getRoutePath('article:add/edit')
    const fallbackPaths = ['/article-manage/article/add/edit', '/_detail/article/edit']
    const candidates = [dynamicPath, ...fallbackPaths].filter(Boolean) as string[]
    const matched = candidates.find((path) => routePaths.has(path))
    return matched || fallbackPaths[0]
}

/**
 * 文章编辑路由
 */
const articleEditRoutePath = computed(() => resolveEditPath())

/**
 * 安全获取当前页列表，避免接口异常结构导致页面报错
 */
const safeLists = computed<ArticleListItem[]>(() =>
    Array.isArray(pager.lists) ? (pager.lists as ArticleListItem[]) : []
)

/**
 * 当前页待审核数量
 */
const pageAuditPendingCount = computed(
    () => safeLists.value.filter((item) => Number(item.reviewStatus) === 1).length
)

/**
 * 当前页已发布数量
 */
const pagePublishedCount = computed(
    () => safeLists.value.filter((item) => Number(item.isShow) === 1).length
)

/**
 * 当前页待发布数量
 */
const pageDraftCount = computed(
    () => safeLists.value.filter((item) => Number(item.isShow) !== 1).length
)

/**
 * 审核状态标签颜色
 */
const getReviewTagType = (reviewStatus: number | string | undefined) => {
    const status = Number(reviewStatus || 0)
    if (status === 1) return 'warning'
    if (status === 2) return 'success'
    if (status === 3) return 'danger'
    return 'info'
}

/**
 * 跳转到文章发布页
 */
const handleCreate = async () => {
    const path = articleEditRoutePath.value
    if (!path) {
        feedback.msgError('未找到文章编辑路由，请在角色权限中授权 article:add/edit')
        return
    }
    await router.push({ path })
}

/**
 * 跳转到文章编辑页
 */
const handleEdit = async (row: ArticleListItem) => {
    const path = articleEditRoutePath.value
    if (!path) {
        feedback.msgError('未找到文章编辑路由，请在角色权限中授权 article:add/edit')
        return
    }
    await router.push({
        path,
        query: { id: row.id }
    })
}

/**
 * 切换文章发布状态
 */
const togglePublish = async (row: ArticleListItem) => {
    try {
        await articleStatus({ id: row.id })
        feedback.msgSuccess(Number(row.isShow) === 1 ? '已转为待发布' : '已发表')
        getLists()
    } catch (error) {
        getLists()
    }
}

/**
 * 审核通过并发布文章
 */
const handleAuditPass = async (row: ArticleListItem) => {
    try {
        await feedback.confirm('确认审核通过并直接发布该文章？')
    } catch (error) {
        return
    }
    await articleFrontAudit({
        id: Number(row.id),
        reviewStatus: 2
    })
    feedback.msgSuccess('审核通过并发布成功')
    getLists()
}

/**
 * 在前台新窗口查看文章
 */
const handleView = (row: ArticleListItem) => {
    const articleSlug = String(row?.slug || row?.id || '').trim()
    const articlePath = resolveFrontendArticleDetailPath()
    window.open(`${frontendUrl}${articlePath}/${encodeURIComponent(articleSlug)}`, '_blank')
}

/**
 * 删除文章
 */
const handleDelete = async (id: number) => {
    try {
        await feedback.confirm('确定要删除？')
    } catch (error) {
        return
    }
    await articleDelete({ id })
    feedback.msgSuccess('删除成功')
    getLists()
}

/**
 * 一键生成测试数据（文章/分类/标签/专题关联）
 */
const handleSeedTestData = async () => {
    try {
        await feedback.confirm('将自动生成测试文章用于联调验证，是否继续？')
    } catch (error) {
        return
    }
    seedLoading.value = true
    try {
        const data = await articleSeedTestData({ count: 12 })
        feedback.msgSuccess(`已生成 ${Number(data?.created || 0)} 条测试文章`)
        resetPage()
    } catch (error: any) {
        feedback.msgError(error?.message || '生成测试数据失败')
    } finally {
        seedLoading.value = false
    }
}

/**
 * 打开“批量导入公众号文章”弹窗并重置表单状态。
 */
const openBatchWechatImportDialog = () => {
    batchWechatImportDialogVisible.value = true
    batchWechatImportResult.value = null
    batchWechatImportForm.cid = ''
    batchWechatImportForm.author = ''
    batchWechatImportForm.urlsText = ''
    batchWechatImportForm.status = 'draft'
    batchWechatImportForm.aiEnabled = false
    fetchBatchImportAuthorOptions('')
}

/**
 * 规范化批量导入结果行，兼容后端返回结构差异。
 */
const normalizeBatchWechatImportRows = (rows: any): BatchWechatImportResultRow[] => {
    if (!Array.isArray(rows)) return []
    return rows.map((item: any) => ({
        status: String(item?.status || '').trim().toLowerCase(),
        url: String(item?.url || '').trim(),
        articleId:
            Number.isFinite(Number(item?.articleId)) && Number(item?.articleId) > 0
                ? Number(item?.articleId)
                : undefined,
        title: String(item?.title || '').trim(),
        reason: String(item?.reason || '').trim()
    }))
}

/**
 * 提交批量导入文章任务。
 */
const handleBatchWechatImportSubmit = async () => {
    const cid = Number(batchWechatImportForm.cid || 0)
    const author = String(batchWechatImportForm.author || '').trim()
    const urlsText = String(batchWechatImportForm.urlsText || '').trim()
    if (!Number.isInteger(cid) || cid <= 0) {
        feedback.msgWarning('请选择文章栏目')
        return
    }
    if (!author) {
        feedback.msgWarning('请选择作者')
        return
    }
    if (!urlsText) {
        feedback.msgWarning('请至少输入一个公众号链接')
        return
    }
    batchWechatImportLoading.value = true
    try {
        const result: any = await articleImportWechatBatch({
            cid,
            author,
            urls: urlsText,
            status: batchWechatImportForm.status,
            aiEnabled: batchWechatImportForm.aiEnabled === true
        })
        const normalizedRows = normalizeBatchWechatImportRows(result?.rows || result?.data?.rows || [])
        batchWechatImportResult.value = {
            created: Number(result?.created || result?.data?.created || 0),
            failed: Number(result?.failed || result?.data?.failed || 0),
            rows: normalizedRows
        }
        feedback.msgSuccess(
            `导入完成：新增 ${batchWechatImportResult.value.created} 条，失败 ${batchWechatImportResult.value.failed} 条`
        )
        resetPage()
    } catch (error: any) {
        feedback.msgError(error?.message || '批量导入文章失败')
    } finally {
        batchWechatImportLoading.value = false
    }
}

/**
 * 应用文章列表快捷筛选
 */
const applyQuickFilter = (type: 'all' | 'pendingReview' | 'published' | 'draft') => {
    if (type === 'all') {
        queryParams.isShow = ''
        queryParams.reviewStatus = ''
    }
    if (type === 'pendingReview') {
        queryParams.isShow = ''
        queryParams.reviewStatus = 1 as any
    }
    if (type === 'published') {
        queryParams.isShow = 1 as any
        queryParams.reviewStatus = ''
    }
    if (type === 'draft') {
        queryParams.isShow = 0 as any
        queryParams.reviewStatus = ''
    }
    resetPage()
}

onActivated(() => {
    getLists()
})

getLists()
</script>

<style scoped>
.article-summary {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
}

.article-actions {
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.article-quick-filters {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
}

.article-quick-filters__label {
    font-size: 12px;
    color: #909399;
}
</style>
