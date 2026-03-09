<!--
 * @file views/uied/category/index.vue
 * @description UIED 分类管理页面
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
-->
<template>
    <div class="category-lists">
        <el-card class="!border-none" shadow="never">
            <el-form ref="formRef" class="mb-[-16px]" :model="queryParams" :inline="true">
                <el-form-item label="分类名称">
                    <el-input
                        class="w-[200px]"
                        v-model="queryParams.keyword"
                        placeholder="搜索分类名称"
                        clearable
                        @keyup.enter="resetPage"
                    />
                </el-form-item>
                <el-form-item label="父级分类">
                    <el-select
                        class="w-[200px]"
                        v-model="queryParams.parentId"
                        clearable
                        placeholder="全部"
                    >
                        <el-option label="顶级分类" :value="0" />
                        <el-option
                            v-for="item in topCategories"
                            :key="item.id"
                            :label="item.pathLabel || item.name"
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
            <div class="mb-4 flex justify-between">
                <div>
                    <el-button type="primary" @click="handleAdd()">
                        <template #icon><icon name="el-icon-Plus" /></template>
                        添加分类
                    </el-button>
                </div>
                <div class="text-gray-400">共 {{ pager.count }} 个分类</div>
            </div>
            <el-table
                size="large"
                v-loading="pager.loading"
                :data="pager.lists"
                row-key="id"
                :tree-props="{ children: 'children', hasChildren: 'hasChildren' }"
            >
                <el-table-column label="ID" prop="id" width="80" />
                <el-table-column label="图标" width="70">
                    <template #default="{ row }">
                        <el-avatar v-if="row.icon" :src="row.icon" :size="32" shape="square" />
                        <el-avatar v-else :size="32" shape="square">
                            {{ row.name?.charAt(0) }}
                        </el-avatar>
                    </template>
                </el-table-column>
                <el-table-column label="分类名称" prop="name" min-width="200" />
                <el-table-column label="别名" prop="slug" min-width="150" />
                <el-table-column label="前端路径" min-width="220" show-overflow-tooltip>
                    <template #default="{ row }">
                        <a
                            :href="getCategoryFrontendUrl(row)"
                            target="_blank"
                            class="text-primary hover:underline"
                        >
                            {{ getCategoryFrontendPath(row) }}
                        </a>
                    </template>
                </el-table-column>
                <el-table-column label="父级" width="120">
                    <template #default="{ row }">
                        <span v-if="isTopLevelCategory(row.parentId)" class="text-gray-400"
                            >顶级分类</span
                        >
                        <span v-else>{{ getParentName(row.parentId) }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="网站数" width="100">
                    <template #default="{ row }">{{ formatIntegerCount(row.websiteCount) }}</template>
                </el-table-column>
                <el-table-column label="浏览量" width="110">
                    <template #default="{ row }">{{ formatIntegerCount(row.clickCount) }}</template>
                </el-table-column>
                <el-table-column label="排序" prop="sortOrder" width="80" />
                <el-table-column label="状态" width="80">
                    <template #default="{ row }">
                        <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
                            {{ row.isActive ? '显示' : '隐藏' }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="操作" width="180" fixed="right">
                    <template #default="{ row }">
                        <el-button type="primary" link @click="handleAdd(row.id)"
                            >添加子分类</el-button
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

        <!-- 添加/编辑弹窗 -->
        <el-dialog
            v-model="showEdit"
            :title="editData.id ? '编辑分类' : '添加分类'"
            width="600px"
            :close-on-click-modal="false"
        >
            <el-form ref="editFormRef" :model="editData" :rules="editRules" label-width="100px">
                <el-form-item label="分类名称" prop="name">
                    <el-input v-model="editData.name" placeholder="请输入分类名称" />
                </el-form-item>
                <el-form-item label="分类别名" prop="slug">
                    <el-input v-model="editData.slug" placeholder="请输入分类别名（URL友好）" />
                </el-form-item>
                <el-form-item label="父级分类">
                    <el-select
                        v-model="editData.parentId"
                        placeholder="请选择父级分类"
                        style="width: 100%"
                        filterable
                        clearable
                    >
                        <el-option label="顶级分类" :value="0" />
                        <el-option
                            v-for="item in availableParentOptions"
                            :key="item.id"
                            :label="item.pathLabel || item.name"
                            :value="item.id"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item label="分类描述">
                    <el-input
                        v-model="editData.description"
                        type="textarea"
                        :rows="3"
                        placeholder="请输入分类描述"
                    />
                </el-form-item>
                <el-divider content-position="left">SEO 设置（提升搜索引擎排名）</el-divider>
                <el-form-item label="AI生成SEO">
                    <el-button
                        type="primary"
                        plain
                        :loading="seoGenerating"
                        @click="handleGenerateSeoByAi"
                    >
                        根据分类名称生成SEO信息
                    </el-button>
                    <span class="ml-2 text-gray-400 text-xs">
                        将自动生成 SEO 标题、描述、关键词
                    </span>
                </el-form-item>
                <el-form-item label="SEO标题">
                    <template #label>
                        <span>SEO标题</span>
                        <el-tooltip
                            content="用于搜索引擎展示的页面标题，如「2025年最好的96个AI智能体工具」，建议30字以内，包含核心关键词"
                            placement="top"
                        >
                            <el-icon style="margin-left: 4px; cursor: help; color: #909399"
                                ><QuestionFilled
                            /></el-icon>
                        </el-tooltip>
                    </template>
                    <el-input v-model="editData.seoTitle" placeholder="留空则使用分类名称" />
                </el-form-item>
                <el-form-item label="SEO描述">
                    <template #label>
                        <span>SEO描述</span>
                        <el-tooltip
                            content="用于搜索引擎展示的页面描述，建议150字以内。会显示在分类页面头部，帮助用户和搜索引擎理解该分类内容"
                            placement="top"
                        >
                            <el-icon style="margin-left: 4px; cursor: help; color: #909399"
                                ><QuestionFilled
                            /></el-icon>
                        </el-tooltip>
                    </template>
                    <el-input
                        v-model="editData.seoDescription"
                        type="textarea"
                        :rows="3"
                        placeholder="留空则使用分类描述"
                    />
                </el-form-item>
                <el-form-item label="SEO关键词">
                    <template #label>
                        <span>SEO关键词</span>
                        <el-tooltip
                            content="多个关键词用英文逗号分隔，建议5-10个核心关键词，有助于搜索引擎索引"
                            placement="top"
                        >
                            <el-icon style="margin-left: 4px; cursor: help; color: #909399"
                                ><QuestionFilled
                            /></el-icon>
                        </el-tooltip>
                    </template>
                    <el-input
                        v-model="editData.seoKeywords"
                        placeholder="关键词1,关键词2,关键词3"
                    />
                </el-form-item>
                <el-divider content-position="left">其他设置</el-divider>
                <el-form-item label="图标URL">
                    <el-input v-model="editData.icon" placeholder="请输入图标URL" />
                </el-form-item>
                <el-form-item label="主题色">
                    <el-color-picker v-model="editData.themeColor" />
                </el-form-item>
                <el-form-item label="排序">
                    <el-input-number v-model="editData.sortOrder" :min="0" :max="9999" />
                </el-form-item>
                <el-form-item label="状态">
                    <el-switch v-model="editData.isActive" :active-value="1" :inactive-value="0" />
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

<script lang="ts" setup name="uiedCategory">
import {
    uiedCategoryList,
    uiedCategoryAll,
    uiedCategoryAdd,
    uiedCategoryEdit,
    uiedCategoryDelete,
    uiedAiChat
} from '@/api/uied'
import { usePaging } from '@/hooks/usePaging'
import feedback from '@/utils/feedback'
import { QuestionFilled } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'

interface CategoryOption {
    id: number
    name: string
    parentId: number
    pathLabel?: string
}

const queryParams = reactive({
    keyword: '',
    parentId: '' as string | number
})

/**
 * 获取前端基础地址：优先读取环境变量，未配置时回退本地开发地址。
 */
const getFrontendBaseUrl = () =>
    String(import.meta.env.VITE_FRONTEND_URL || 'http://localhost:3003')
        .trim()
        .replace(/\/+$/g, '')

const FRONTEND_BASE_URL = getFrontendBaseUrl()

/**
 * 生成分类前端相对路径，优先使用 slug。
 */
const getCategoryFrontendPath = (row: any): string => {
    const pathId = String(row?.slug || row?.id || '').trim()
    return pathId ? `/category/${pathId}` : '/category'
}

/**
 * 生成分类前端完整访问地址，便于后台直接跳转验证。
 */
const getCategoryFrontendUrl = (row: any): string =>
    `${FRONTEND_BASE_URL}${getCategoryFrontendPath(row)}`

/**
 * 格式化整数统计值，异常数据统一回退为 0。
 */
const formatIntegerCount = (value: unknown): string => {
    const parsed = Number.parseInt(String(value ?? 0), 10)
    if (!Number.isFinite(parsed) || parsed < 0) return '0'
    return parsed.toLocaleString('zh-CN')
}

const { pager, getLists, resetPage, resetParams } = usePaging({
    fetchFun: uiedCategoryList,
    params: queryParams
})

// 分类选项缓存
const topCategories = ref<CategoryOption[]>([])
const allCategories = ref<CategoryOption[]>([])

/**
 * 规范化父级分类 ID：
 * 统一将 null/undefined/空值/0 视为顶级分类（0）。
 */
const normalizeParentIdValue = (value: unknown): number => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed <= 0) return 0
    return Math.trunc(parsed)
}

/**
 * 判断给定 parentId 是否属于顶级分类。
 */
const isTopLevelCategory = (parentId: unknown): boolean => normalizeParentIdValue(parentId) === 0

/**
 * 构建分类路径标签（例如：设计 / 图标），用于父级下拉更清晰地展示层级。
 */
const buildCategoryPathMap = (rows: CategoryOption[]): Record<number, string> => {
    const byId = new Map<number, CategoryOption>()
    rows.forEach((item) => byId.set(item.id, item))
    const cache = new Map<number, string>()

    const resolvePath = (id: number, depth = 0): string => {
        if (cache.has(id)) return cache.get(id) || ''
        const current = byId.get(id)
        if (!current) return ''
        if (depth > rows.length + 2) return current.name
        const parentId = normalizeParentIdValue(current.parentId)
        const label =
            parentId > 0
                ? `${resolvePath(parentId, depth + 1)} / ${current.name}`
                : current.name
        cache.set(id, label)
        return label
    }

    const pathMap: Record<number, string> = {}
    rows.forEach((item) => {
        pathMap[item.id] = resolvePath(item.id)
    })
    return pathMap
}

/**
 * 递归收集某个分类下的全部子孙分类，用于防止将父级设置到自己的子级导致循环。
 */
const collectDescendantIds = (rootId: number): Set<number> => {
    const descendants = new Set<number>()
    const queue = [ rootId ]
    while (queue.length > 0) {
        const current = Number(queue.shift() || 0)
        if (current <= 0) continue
        allCategories.value.forEach((item) => {
            if (normalizeParentIdValue(item.parentId) !== current) return
            if (descendants.has(item.id)) return
            descendants.add(item.id)
            queue.push(item.id)
        })
    }
    return descendants
}

const getTopCategories = async () => {
    try {
        const res = await uiedCategoryAll()
        const normalizedRows: CategoryOption[] = (Array.isArray(res) ? res : [])
            .map((item: any) => ({
                id: Number(item?.id || 0),
                name: String(item?.name || '').trim(),
                parentId: normalizeParentIdValue(item?.parentId)
            }))
            .filter((item) => item.id > 0 && item.name.length > 0)
        const pathMap = buildCategoryPathMap(normalizedRows)
        allCategories.value = normalizedRows.map((item) => ({
            ...item,
            pathLabel: pathMap[item.id] || item.name
        }))
        topCategories.value = allCategories.value.filter((item) => item.parentId === 0)
    } catch (error) {
        console.error('获取分类列表失败:', error)
    }
}

/**
 * 通过父级 ID 获取父级分类名称。
 */
const getParentName = (parentId: number | null | undefined) => {
    const normalizedParentId = normalizeParentIdValue(parentId)
    if (normalizedParentId === 0) return '顶级分类'
    const parent = allCategories.value.find((item) => item.id === normalizedParentId)
    return parent?.name || '-'
}

/**
 * 父级分类可选项：
 * 1. 编辑时排除当前分类自身；
 * 2. 编辑时排除当前分类的全部子孙，避免形成循环层级。
 */
const availableParentOptions = computed(() => {
    const currentId = Number(editData.id || 0)
    if (currentId <= 0) return allCategories.value
    const blocked = collectDescendantIds(currentId)
    blocked.add(currentId)
    return allCategories.value.filter((item) => !blocked.has(item.id))
})

// 编辑相关
const showEdit = ref(false)
const editLoading = ref(false)
const editFormRef = ref<FormInstance>()
const seoGenerating = ref(false)
const editData = reactive({
    id: 0,
    name: '',
    slug: '',
    parentId: 0,
    description: '',
    seoTitle: '',
    seoDescription: '',
    seoKeywords: '',
    icon: '',
    themeColor: '',
    sortOrder: 0,
    isActive: 1
})

const editRules: FormRules = {
    name: [{ required: true, message: '请输入分类名称', trigger: 'blur' }],
    slug: [{ required: true, message: '请输入分类别名', trigger: 'blur' }]
}

/**
 * 提取 AI 文本中的 JSON 片段并解析。
 */
const extractJsonPayload = (content: string): Record<string, any> | null => {
    const text = String(content || '').trim()
    if (!text) return null
    const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
    const candidates = [ codeMatch?.[1] || '', text ]
    for (const raw of candidates) {
        const trimmed = String(raw || '').trim()
        if (!trimmed) continue
        try {
            return JSON.parse(trimmed)
        } catch (_error) {
            const start = trimmed.indexOf('{')
            const end = trimmed.lastIndexOf('}')
            if (start >= 0 && end > start) {
                try {
                    return JSON.parse(trimmed.slice(start, end + 1))
                } catch (__error) {
                    // ignore
                }
            }
        }
    }
    return null
}

/**
 * 规范化 SEO 文本字段长度和空白字符。
 */
const normalizeSeoText = (value: unknown, maxLength: number): string =>
    String(value || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength)

/**
 * 规范化关键词：支持数组/字符串输入，统一为逗号分隔文本。
 */
const normalizeSeoKeywordsText = (value: unknown): string => {
    const source = Array.isArray(value)
        ? value.map((item) => String(item || ''))
        : String(value || '')
              .split(/[，,]/)
              .map((item) => String(item || ''))
    const keywords = source
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 12)
    return Array.from(new Set(keywords)).join(',')
}

/**
 * 生成“分类 SEO”专用提示词。
 */
const buildCategorySeoPrompt = (name: string, description: string, slug: string): string => `请根据以下分类信息生成适用于网站目录页的 SEO 内容。
请直接返回 JSON，不要输出额外解释文字。

分类名称：${name}
分类描述：${description || '（无）'}
分类别名：${slug || '（无）'}

输出 JSON 格式：
{
  "seoTitle": "30字以内，突出核心关键词",
  "seoDescription": "80-140字，简明描述该分类收录内容与价值",
  "seoKeywords": ["关键词1","关键词2","关键词3","关键词4","关键词5"]
}`

/**
 * 基于分类名称与描述调用 AI 自动生成 SEO 三字段。
 */
const handleGenerateSeoByAi = async () => {
    const name = String(editData.name || '').trim()
    if (!name) {
        feedback.msgWarning('请先填写分类名称，再生成 SEO')
        return
    }
    seoGenerating.value = true
    try {
        const prompt = buildCategorySeoPrompt(
            name,
            String(editData.description || '').trim(),
            String(editData.slug || '').trim()
        )
        const res = await uiedAiChat({
            message: prompt,
            context: []
        })
        const reply = String(
            res?.reply || res?.content || res?.data?.reply || res?.data?.content || ''
        ).trim()
        const json = extractJsonPayload(reply)
        if (!json) {
            feedback.msgError('AI 返回格式无法解析，请重试')
            return
        }
        editData.seoTitle = normalizeSeoText(json.seoTitle, 200)
        editData.seoDescription = normalizeSeoText(json.seoDescription, 500)
        editData.seoKeywords = normalizeSeoKeywordsText(json.seoKeywords)
        feedback.msgSuccess('已根据分类信息生成 SEO')
    } catch (error: any) {
        console.error('AI 生成分类 SEO 失败:', error)
        feedback.msgError(error?.message || 'AI 生成失败，请检查 AI 配置')
    } finally {
        seoGenerating.value = false
    }
}

const resetEditData = () => {
    editData.id = 0
    editData.name = ''
    editData.slug = ''
    editData.parentId = 0
    editData.description = ''
    editData.seoTitle = ''
    editData.seoDescription = ''
    editData.seoKeywords = ''
    editData.icon = ''
    editData.themeColor = ''
    editData.sortOrder = 0
    editData.isActive = 1
}

const handleAdd = (parentId?: number) => {
    resetEditData()
    if (parentId) {
        editData.parentId = normalizeParentIdValue(parentId)
    }
    showEdit.value = true
}

const handleEdit = (row: any) => {
    editData.id = row.id
    editData.name = row.name
    editData.slug = row.slug || ''
    editData.parentId = normalizeParentIdValue(row.parentId)
    editData.description = row.description || ''
    editData.seoTitle = row.seoTitle || ''
    editData.seoDescription = row.seoDescription || ''
    editData.seoKeywords = row.seoKeywords || ''
    editData.icon = row.icon || ''
    editData.themeColor = row.themeColor || ''
    editData.sortOrder = row.sortOrder || 0
    editData.isActive = row.isActive ? 1 : 0
    showEdit.value = true
}

const handleSubmit = async () => {
    await editFormRef.value?.validate()
    const normalizedParentId = normalizeParentIdValue(editData.parentId)
    if (editData.id > 0 && normalizedParentId === Number(editData.id)) {
        feedback.msgWarning('父级分类不能选择当前分类')
        return
    }
    if (editData.id > 0) {
        const descendants = collectDescendantIds(Number(editData.id))
        if (normalizedParentId > 0 && descendants.has(normalizedParentId)) {
            feedback.msgWarning('父级分类不能选择当前分类的子级')
            return
        }
    }
    editLoading.value = true
    try {
        const submitData = {
            ...editData,
            parentId: normalizedParentId
        }
        if (editData.id) {
            await uiedCategoryEdit(submitData)
            feedback.msgSuccess('编辑成功')
        } else {
            await uiedCategoryAdd(submitData)
            feedback.msgSuccess('添加成功')
        }
        showEdit.value = false
        getLists()
        getTopCategories()
    } finally {
        editLoading.value = false
    }
}

const handleDelete = async (id: number) => {
    await feedback.confirm('确定要删除该分类吗？删除后该分类下的网站将变为未分类状态。')
    await uiedCategoryDelete({ id })
    feedback.msgSuccess('删除成功')
    getLists()
    getTopCategories()
}

onMounted(() => {
    getTopCategories()
})

getLists()
</script>
