<!--
 * @file views/uied/page/index.vue
 * @description UIED 页面管理
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
-->
<template>
    <div class="page-lists">
        <el-card class="!border-none" shadow="never">
            <el-form :inline="true" :model="queryParams" class="mb-4">
                <el-form-item label="关键词">
                    <el-input
                        v-model="queryParams.keyword"
                        clearable
                        placeholder="页面名称/别名/Hero 标题"
                        style="width: 260px"
                        @keyup.enter="handleSearch"
                    />
                </el-form-item>
                <el-form-item label="状态">
                    <el-select
                        v-model="queryParams.isActive"
                        clearable
                        placeholder="全部状态"
                        style="width: 140px"
                    >
                        <el-option label="显示" value="1" />
                        <el-option label="隐藏" value="0" />
                    </el-select>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="handleSearch">查询</el-button>
                    <el-button @click="handleResetSearch">重置</el-button>
                </el-form-item>
            </el-form>
            <div class="mb-4 flex justify-between">
                <el-button type="primary" @click="handleAdd">
                    <template #icon><icon name="el-icon-Plus" /></template>
                    添加页面
                </el-button>
                <div class="text-gray-400">共 {{ pager.count }} 个页面</div>
            </div>
            <el-table size="large" v-loading="pager.loading" :data="pager.lists">
                <el-table-column label="ID" prop="id" width="80" />
                <el-table-column label="页面名称" prop="name" min-width="120" />
                <el-table-column label="别名" prop="slug" min-width="100" />
                <el-table-column
                    label="Hero标题"
                    prop="heroTitle"
                    min-width="150"
                    show-overflow-tooltip
                />
                <el-table-column label="显示模式" width="100">
                    <template #default="{ row }">
                        <el-tag
                            size="small"
                            :type="row.heroDisplayMode === 'iconScroll' ? 'warning' : ''"
                        >
                            {{ row.heroDisplayMode === 'iconScroll' ? '图标滚动' : '搜索框' }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="排序" width="140">
                    <template #default="{ row }">
                        <div class="page-sort-cell">
                            <el-input-number
                                v-model="rowSortMap[row.id]"
                                :min="0"
                                :controls="false"
                                size="small"
                                style="width: 80px"
                                @change="() => handleQuickSortSave(row)"
                            />
                            <el-button
                                type="primary"
                                link
                                :loading="Boolean(rowSortSavingMap[row.id])"
                                @click="handleQuickSortSave(row)"
                            >
                                保存
                            </el-button>
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
                <el-table-column label="操作" width="180" fixed="right">
                    <template #default="{ row }">
                        <el-button type="primary" link @click="handleCategories(row)"
                            >分类配置</el-button
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

        <!-- 编辑弹窗 -->
        <el-dialog
            v-model="showEdit"
            :title="editData.id ? '编辑页面' : '添加页面'"
            width="700px"
            top="5vh"
        >
            <el-form ref="editFormRef" :model="editData" :rules="editRules" label-width="110px">
                <el-tabs v-model="editTab">
                    <!-- 基本信息 -->
                    <el-tab-pane label="基本信息" name="basic">
                        <el-form-item label="页面名称" prop="name">
                            <el-input v-model="editData.name" placeholder="请输入页面名称" />
                        </el-form-item>
                        <el-form-item label="页面别名" prop="slug">
                            <el-input
                                v-model="editData.slug"
                                placeholder="请输入页面别名（URL友好）"
                                @input="handleSlugInput"
                            />
                            <div class="text-gray-400 text-xs mt-1">
                                前台路径预览：<code>/p/{{ editData.slug || 'your-page-slug' }}</code>
                            </div>
                        </el-form-item>
                        <el-form-item label="页面描述">
                            <el-input v-model="editData.description" type="textarea" :rows="2" />
                        </el-form-item>
                        <el-form-item label="排序">
                            <el-input-number v-model="editData.sortOrder" :min="0" />
                        </el-form-item>
                        <el-form-item label="状态">
                            <el-switch v-model="editData.isActive" />
                        </el-form-item>
                    </el-tab-pane>

                    <!-- Hero 横幅配置 -->
                    <el-tab-pane label="Hero横幅" name="hero">
                        <el-form-item label="Hero标题">
                            <el-input v-model="editData.heroTitle" placeholder="首屏大标题" />
                        </el-form-item>
                        <el-form-item label="高亮文本">
                            <el-input
                                v-model="editData.heroHighlightText"
                                placeholder="标题中需要高亮的文本，如: AI工具"
                            />
                            <div class="text-gray-400 text-xs mt-1">标题中需要高亮显示的文本</div>
                        </el-form-item>
                        <el-form-item label="Hero副标题">
                            <el-input
                                v-model="editData.heroSubtitle"
                                type="textarea"
                                :rows="2"
                                placeholder="首屏副标题"
                            />
                        </el-form-item>
                        <el-form-item label="热门搜索标签">
                            <el-input
                                v-model="editData.hotSearchTagsStr"
                                type="textarea"
                                :rows="2"
                                placeholder="标签1,标签2,标签3"
                            />
                            <div class="text-gray-400 text-xs mt-1">多个标签用逗号分隔</div>
                        </el-form-item>
                        <el-form-item label="背景类型">
                            <el-select v-model="editData.heroBgType" style="width: 100%">
                                <el-option label="默认背景图" value="default" />
                                <el-option label="纯色背景" value="color" />
                                <el-option label="渐变背景" value="gradient" />
                                <el-option label="自定义图片" value="image" />
                            </el-select>
                        </el-form-item>
                        <el-form-item label="背景值" v-if="editData.heroBgType !== 'default'">
                            <el-input
                                v-model="editData.heroBgValue"
                                :placeholder="getBgPlaceholder()"
                            />
                            <div class="text-gray-400 text-xs mt-1">{{ getBgHint() }}</div>
                        </el-form-item>
                        <el-form-item label="显示模式">
                            <el-select v-model="editData.heroDisplayMode" style="width: 100%">
                                <el-option label="搜索框模式" value="search" />
                                <el-option label="图标滚动墙" value="iconScroll" />
                            </el-select>
                            <div class="text-gray-400 text-xs mt-1">
                                图标滚动墙会在背景显示网站图标滚动效果
                            </div>
                        </el-form-item>

                        <!-- 图标滚动墙分类选择 -->
                        <el-form-item
                            label="滚动图标分类"
                            v-if="editData.heroDisplayMode === 'iconScroll'"
                        >
                            <div class="scroll-categories-selector">
                                <!-- 多选分类 -->
                                <el-select
                                    v-model="selectedScrollCategoryIds"
                                    placeholder="选择要显示图标的分类"
                                    style="width: 100%"
                                    multiple
                                    filterable
                                    clearable
                                >
                                    <el-option
                                        v-for="cat in scrollCategories"
                                        :key="cat.id"
                                        :label="cat.name"
                                        :value="cat.id"
                                    />
                                </el-select>
                                <div class="text-gray-400 text-xs mt-2">
                                    选择分类后，该分类下的网站图标将在 Hero 区域滚动显示
                                </div>
                                <div
                                    v-if="loadingScrollWebsites"
                                    class="text-blue-500 text-xs mt-1"
                                >
                                    正在加载分类下的网站...
                                </div>
                                <div
                                    v-else-if="selectedScrollWebsites.length > 0"
                                    class="text-green-500 text-xs mt-1"
                                >
                                    已匹配 {{ selectedScrollWebsites.length }} 个网站图标
                                </div>
                            </div>
                        </el-form-item>
                    </el-tab-pane>

                    <!-- 页面配置 -->
                    <el-tab-pane label="页面配置" name="config">
                        <el-form-item label="搜索占位符">
                            <el-input
                                v-model="editData.searchPlaceholder"
                                placeholder="搜索框占位文本"
                            />
                        </el-form-item>
                        <el-form-item label="启用搜索">
                            <el-switch v-model="editData.searchEnabled" />
                        </el-form-item>
                        <el-form-item label="显示热门推荐">
                            <el-switch v-model="editData.showHotRecommendations" />
                        </el-form-item>
                        <el-form-item label="显示分类">
                            <el-switch v-model="editData.showCategories" />
                        </el-form-item>
                        <el-form-item label="显示侧边栏">
                            <el-switch v-model="editData.showSidebar" />
                        </el-form-item>
                        <el-form-item label="主题色">
                            <el-color-picker v-model="editData.themeColor" />
                            <span class="ml-2 text-gray-400">{{
                                editData.themeColor || '未设置'
                            }}</span>
                        </el-form-item>
                    </el-tab-pane>
                </el-tabs>
            </el-form>
            <template #footer>
                <el-button @click="showEdit = false">取消</el-button>
                <el-button type="primary" :loading="editLoading" @click="handleSubmit"
                    >确定</el-button
                >
            </template>
        </el-dialog>

        <!-- 分类配置弹窗 -->
        <el-dialog v-model="showCategories" title="页面分类配置" width="920px">
            <div class="page-category-config">
                <div class="page-category-config__panel">
                    <div class="page-category-config__panel-title">分类树（支持搜索）</div>
                    <el-input
                        v-model="categoryKeyword"
                        clearable
                        placeholder="输入分类名称搜索"
                        @input="handleCategoryKeywordChange"
                    />
                    <div class="page-category-config__tree">
                        <el-tree
                            ref="categoryTreeRef"
                            node-key="id"
                            show-checkbox
                            check-strictly
                            :data="categoryTreeData"
                            :props="{ label: 'pathLabel', children: 'children' }"
                            :filter-node-method="filterCategoryNode"
                            @check="handleCategoryTreeCheck"
                        />
                    </div>
                </div>
                <div class="page-category-config__panel">
                    <div class="page-category-config__panel-title page-category-config__panel-title--with-action">
                        <span>已选分类（可排序）</span>
                        <el-button
                            v-if="categorySelectedRows.length > 0"
                            type="danger"
                            link
                            @click="clearSelectedCategories"
                        >
                            清空
                        </el-button>
                    </div>
                    <div v-if="categorySelectedRows.length === 0" class="page-category-config__empty">
                        请在左侧勾选要展示的分类（建议按业务顺序排列）。
                    </div>
                    <div v-else class="page-category-config__selected-list">
                        <div
                            v-for="(item, index) in categorySelectedRows"
                            :key="item.id"
                            class="page-category-config__selected-item"
                        >
                            <div class="page-category-config__selected-main">
                                <span class="page-category-config__selected-index">{{ index + 1 }}</span>
                                <div class="page-category-config__selected-icon-wrap">
                                    <icon v-if="item.icon" :name="item.icon" class="page-category-config__selected-icon" />
                                    <span v-else class="page-category-config__selected-icon-empty">无图标</span>
                                </div>
                                <span class="page-category-config__selected-name">{{ item.pathLabel }}</span>
                            </div>
                            <div class="page-category-config__selected-icon-editor">
                                <icon-picker v-model="item.icon" />
                            </div>
                            <div class="page-category-config__selected-actions">
                                <el-button
                                    type="primary"
                                    link
                                    :disabled="index === 0"
                                    @click="moveSelectedCategory(index, -1)"
                                >
                                    上移
                                </el-button>
                                <el-button
                                    type="primary"
                                    link
                                    :disabled="index === categorySelectedRows.length - 1"
                                    @click="moveSelectedCategory(index, 1)"
                                >
                                    下移
                                </el-button>
                                <el-button type="danger" link @click="removeSelectedCategory(item.id)">
                                    移除
                                </el-button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <template #footer>
                <el-button @click="showCategories = false">取消</el-button>
                <el-button type="primary" :loading="categoryLoading" @click="handleSaveCategories"
                    >保存</el-button
                >
            </template>
        </el-dialog>
    </div>
</template>

<script lang="ts" setup name="uiedPage">
import {
    uiedPageList,
    uiedPageAdd,
    uiedPageEdit,
    uiedPageDelete,
    uiedPageCategories,
    uiedPageUpdateCategories,
    uiedCategoryAll,
    uiedWebsiteSearch,
    uiedWebsiteList
} from '@/api/uied'
import { usePaging } from '@/hooks/usePaging'
import feedback from '@/utils/feedback'
import type { FormInstance, FormRules } from 'element-plus'

interface CategoryOption {
    id: number
    name: string
    parentId: number | null
    sortOrder: number
    pathLabel: string
    icon?: string
}

interface CategoryTreeNode extends CategoryOption {
    children: CategoryTreeNode[]
}

const queryParams = reactive({
    keyword: '',
    isActive: ''
})

const { pager, getLists } = usePaging({
    fetchFun: uiedPageList,
    params: queryParams
})

const rowSortMap = reactive<Record<number, number>>({})
const rowSortSavingMap = reactive<Record<number, boolean>>({})

const showEdit = ref(false)
const editLoading = ref(false)
const editFormRef = ref<FormInstance>()
const editTab = ref('basic')
const slugTouched = ref(false)

// 按分类选择相关
const scrollCategories = ref<any[]>([])
const selectedScrollCategoryIds = ref<number[]>([])
const selectedScrollWebsites = ref<any[]>([])
const isEditLoading = ref(false) // 防止编辑加载时 watcher 覆盖数据

const editData = reactive({
    id: 0,
    name: '',
    slug: '',
    description: '',
    sortOrder: 0,
    isActive: true,
    // Hero 配置
    heroTitle: '',
    heroHighlightText: '',
    heroSubtitle: '',
    hotSearchTagsStr: '', // 用于表单输入，逗号分隔
    heroBgType: 'default',
    heroBgValue: '',
    heroDisplayMode: 'search',
    heroScrollWebsites: [] as number[], // 滚动图标网站ID列表（兼容旧数据）
    heroScrollCategories: [] as number[], // 滚动图标分类ID列表（新方式）
    // 页面配置
    searchPlaceholder: '',
    searchEnabled: true,
    showHotRecommendations: true,
    showCategories: true,
    showSidebar: true,
    themeColor: ''
})

const editRules: FormRules = {
    name: [{ required: true, message: '请输入页面名称', trigger: 'blur' }],
    slug: [{ required: true, message: '请输入页面别名', trigger: 'blur' }]
}

/**
 * 从页面名称生成默认别名（仅新建时自动生成）。
 */
const buildSlugFromName = (name: string): string => {
    const normalized = String(name || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    return normalized.slice(0, 80)
}

/**
 * 手动修改别名后，停止自动覆盖。
 */
const handleSlugInput = () => {
    slugTouched.value = true
}

/**
 * 页面列表查询。
 */
const handleSearch = () => {
    pager.page = 1
    getLists()
}

/**
 * 重置页面列表查询条件。
 */
const handleResetSearch = () => {
    queryParams.keyword = ''
    queryParams.isActive = ''
    pager.page = 1
    getLists()
}

// 获取背景值占位符
const getBgPlaceholder = () => {
    switch (editData.heroBgType) {
        case 'color':
            return '#1a1a2e'
        case 'gradient':
            return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        case 'image':
            return 'https://example.com/bg.jpg'
        default:
            return ''
    }
}

// 获取背景值提示
const getBgHint = () => {
    switch (editData.heroBgType) {
        case 'color':
            return '输入十六进制颜色值，如 #1a1a2e'
        case 'gradient':
            return '输入 CSS 渐变值，如 linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        case 'image':
            return '输入图片 URL 地址'
        default:
            return ''
    }
}

// 加载分类列表（只显示有网站的子分类）
const loadScrollCategories = async () => {
    try {
        const cats = await uiedCategoryAll()
        // 过滤出有网站的分类（通过检查是否有子分类或直接有网站）
        // 这里简化处理：只显示子分类（parent_id 不为空的）
        scrollCategories.value = (cats || []).filter((c: any) => c.parentId !== null)
    } catch (e) {
        console.error('加载分类失败:', e)
    }
}

// 监听分类选择变化，自动获取分类下的网站并更新 selectedScrollWebsites
const loadingScrollWebsites = ref(false)
watch(selectedScrollCategoryIds, async (newIds) => {
    // 编辑加载时不触发，避免覆盖已有数据
    if (isEditLoading.value) return
    if (!newIds || newIds.length === 0) {
        selectedScrollWebsites.value = []
        return
    }
    loadingScrollWebsites.value = true
    try {
        // 逐个分类获取网站，合并去重
        const allWebsites: any[] = []
        const seenIds = new Set<number>()
        for (const catId of newIds) {
            const res = await uiedWebsiteList({
                categoryId: catId,
                includeChildren: 'true',
                pageSize: 200,
                pageNo: 1
            })
            const websites = res?.lists || []
            for (const w of websites) {
                if (!seenIds.has(w.id)) {
                    seenIds.add(w.id)
                    allWebsites.push(w)
                }
            }
        }
        selectedScrollWebsites.value = allWebsites
    } catch (e) {
        console.error('根据分类加载网站失败:', e)
        selectedScrollWebsites.value = []
    } finally {
        loadingScrollWebsites.value = false
    }
})

const resetEditData = () => {
    Object.assign(editData, {
        id: 0,
        name: '',
        slug: '',
        description: '',
        sortOrder: 0,
        isActive: true,
        heroTitle: '',
        heroHighlightText: '',
        heroSubtitle: '',
        hotSearchTagsStr: '',
        heroBgType: 'default',
        heroBgValue: '',
        heroDisplayMode: 'search',
        heroScrollWebsites: [],
        heroScrollCategories: [],
        searchPlaceholder: '',
        searchEnabled: true,
        showHotRecommendations: true,
        showCategories: true,
        showSidebar: true,
        themeColor: ''
    })
    slugTouched.value = false
    selectedScrollCategoryIds.value = []
    editTab.value = 'basic'
}

const handleAdd = () => {
    resetEditData()
    loadScrollCategories()
    showEdit.value = true
}

const handleEdit = async (row: any) => {
    isEditLoading.value = true
    slugTouched.value = true
    // 转换热门标签数组为字符串
    const hotSearchTagsStr = Array.isArray(row.hotSearchTags)
        ? row.hotSearchTags.join(',')
        : row.hotSearchTags || ''

    // 解析滚动网站ID列表
    let heroScrollWebsites: any[] = []
    if (row.heroScrollWebsites) {
        try {
            heroScrollWebsites =
                typeof row.heroScrollWebsites === 'string'
                    ? JSON.parse(row.heroScrollWebsites)
                    : Array.isArray(row.heroScrollWebsites)
                    ? row.heroScrollWebsites
                    : []
        } catch (e) {
            heroScrollWebsites = []
        }
    }

    Object.assign(editData, {
        ...row,
        hotSearchTagsStr,
        heroScrollWebsites,
        searchEnabled: row.searchEnabled !== false,
        showHotRecommendations: row.showHotRecommendations !== false,
        showCategories: row.showCategories !== false,
        showSidebar: row.showSidebar !== false
    })

    // 加载分类列表
    await loadScrollCategories()

    // 如果有滚动网站，加载网站详情
    if (heroScrollWebsites.length > 0) {
        try {
            // 使用 uiedWebsiteSearch 通过 ids 参数查询，支持新旧ID格式
            const idsStr = heroScrollWebsites.map((id) => String(id)).join(',')
            const res = await uiedWebsiteSearch({ ids: idsStr, pageSize: 200 })
            // likeadmin 返回格式: { lists: [...], count: ... }
            const websites = res?.lists || []

            console.log('加载滚动网站:', { heroScrollWebsites, idsStr, res, websites })

            if (websites.length > 0) {
                // 按原顺序排列，支持新数字ID和旧cuid格式
                selectedScrollWebsites.value = heroScrollWebsites
                    .map((id: any) =>
                        websites.find(
                            (w: any) =>
                                String(w.id) === String(id) ||
                                w.oldId === id ||
                                w.oldId === String(id)
                        )
                    )
                    .filter(Boolean)
            } else {
                selectedScrollWebsites.value = []
            }
        } catch (e) {
            console.error('加载滚动网站失败:', e)
            selectedScrollWebsites.value = []
        }
    } else {
        selectedScrollWebsites.value = []
    }

    editTab.value = 'basic'
    showEdit.value = true
    isEditLoading.value = false
}

const handleSubmit = async () => {
    await editFormRef.value?.validate()
    editLoading.value = true
    try {
        // 转换热门标签字符串为数组
        const submitData = {
            ...editData,
            hotSearchTags: editData.hotSearchTagsStr
                ? editData.hotSearchTagsStr
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                : [],
            heroScrollWebsites: selectedScrollWebsites.value.map((w) => w.id)
        }
        delete (submitData as any).hotSearchTagsStr

        if (editData.id) {
            await uiedPageEdit(submitData)
            feedback.msgSuccess('编辑成功')
        } else {
            await uiedPageAdd(submitData)
            feedback.msgSuccess('添加成功')
        }
        showEdit.value = false
        getLists()
    } finally {
        editLoading.value = false
    }
}

const handleDelete = async (id: number) => {
    await feedback.confirm('确定要删除该页面吗？')
    await uiedPageDelete({ id })
    feedback.msgSuccess('删除成功')
    getLists()
}

// 分类配置
const showCategories = ref(false)
const categoryLoading = ref(false)
const currentPageId = ref(0)
const categoryKeyword = ref('')
const categoryTreeRef = ref<any>()
const categoryTreeData = ref<CategoryTreeNode[]>([])
const categoryMap = ref<Record<number, CategoryOption>>({})
const categoryCheckedKeys = ref<number[]>([])
const categorySelectedRows = ref<CategoryOption[]>([])

/**
 * 构建分类树和路径标签，便于运营快速定位一级/二级分类。
 */
const buildCategoryTree = (rows: any[]): { tree: CategoryTreeNode[]; map: Record<number, CategoryOption> } => {
    const normalizedRows = (rows || [])
        .map((item: any) => ({
            id: Number(item.id),
            name: String(item.name || '').trim(),
            parentId:
                item.parentId === null || item.parentId === undefined || item.parentId === ''
                    ? null
                    : Number(item.parentId),
            sortOrder: Number(item.order || item.sortOrder || 0),
            icon: String(item.icon || '').trim()
        }))
        .filter((item: any) => Number.isFinite(item.id) && item.id > 0)
    const byParent = new Map<number | null, any[]>()
    normalizedRows.forEach((item: any) => {
        const key = item.parentId === null ? null : Number(item.parentId)
        if (!byParent.has(key)) byParent.set(key, [])
        byParent.get(key)?.push(item)
    })
    byParent.forEach((list) => {
        list.sort((left, right) => {
            if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder
            return left.id - right.id
        })
    })

    const optionMap: Record<number, CategoryOption> = {}

    /**
     * 递归构建树节点并拼装分类路径。
     */
    const buildNodes = (parentId: number | null, parentNames: string[]): CategoryTreeNode[] => {
        const currentRows = byParent.get(parentId) || []
        return currentRows.map((item: any) => {
            const pathParts = [ ...parentNames, item.name ]
            const node: CategoryTreeNode = {
                id: item.id,
                name: item.name,
                parentId: item.parentId,
                sortOrder: item.sortOrder,
                pathLabel: pathParts.join(' / '),
                children: []
            }
            optionMap[node.id] = {
                id: node.id,
                name: node.name,
                parentId: node.parentId,
                sortOrder: node.sortOrder,
                pathLabel: node.pathLabel,
                icon: item.icon
            }
            node.children = buildNodes(node.id, pathParts)
            return node
        })
    }

    return {
        tree: buildNodes(null, []),
        map: optionMap
    }
}

/**
 * 同步“已选分类”列表，保留人工排序结果。
 */
const syncSelectedCategories = (keys: number[]) => {
    const uniqueKeys = Array.from(new Set(keys.map((key) => Number(key)).filter((key) => Number.isFinite(key))))
    const existingById = new Map(categorySelectedRows.value.map((item) => [item.id, item]))
    const reserved = categorySelectedRows.value.filter((item) => uniqueKeys.includes(item.id))
    const appended = uniqueKeys
        .filter((key) => !existingById.has(key))
        .map((key) => categoryMap.value[key])
        .filter(Boolean)
    categorySelectedRows.value = [ ...reserved, ...appended ]
    categoryCheckedKeys.value = uniqueKeys
}

/**
 * 分类树筛选逻辑。
 */
const filterCategoryNode = (keyword: string, data: any): boolean => {
    if (!keyword) return true
    return String(data?.pathLabel || data?.name || '')
        .toLowerCase()
        .includes(String(keyword).toLowerCase())
}

/**
 * 分类树关键字变化时，触发 tree 过滤。
 */
const handleCategoryKeywordChange = (value: string) => {
    categoryTreeRef.value?.filter(String(value || '').trim())
}

/**
 * 响应分类树勾选变化。
 */
const handleCategoryTreeCheck = () => {
    const keys = (categoryTreeRef.value?.getCheckedKeys(false) || []) as number[]
    syncSelectedCategories(keys)
}

/**
 * 移动已选分类顺序。
 */
const moveSelectedCategory = (index: number, delta: number) => {
    const targetIndex = index + delta
    if (targetIndex < 0 || targetIndex >= categorySelectedRows.value.length) return
    const list = [ ...categorySelectedRows.value ]
    const [current] = list.splice(index, 1)
    list.splice(targetIndex, 0, current)
    categorySelectedRows.value = list
}

/**
 * 移除某个已选分类。
 */
const removeSelectedCategory = (categoryId: number) => {
    categorySelectedRows.value = categorySelectedRows.value.filter((item) => item.id !== categoryId)
    categoryCheckedKeys.value = categorySelectedRows.value.map((item) => item.id)
    categoryTreeRef.value?.setCheckedKeys(categoryCheckedKeys.value, false)
}

/**
 * 清空已选分类。
 */
const clearSelectedCategories = () => {
    categorySelectedRows.value = []
    categoryCheckedKeys.value = []
    categoryTreeRef.value?.setCheckedKeys([], false)
}

/**
 * 打开分类配置弹窗。
 */
const handleCategories = async (row: any) => {
    currentPageId.value = Number(row.id)
    const [cats, pageCats] = await Promise.all([uiedCategoryAll(), uiedPageCategories({ id: row.id })])
    const { tree, map } = buildCategoryTree(cats || [])
    categoryTreeData.value = tree
    categoryMap.value = map
    const orderedPageCats = [ ...(pageCats || []) ].sort(
        (left: any, right: any) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0)
    )
    const selectedIds = orderedPageCats
        .map((item: any) => Number(item.id))
        .filter((id: number) => Number.isFinite(id))
    categoryKeyword.value = ''
    categoryCheckedKeys.value = selectedIds
    categorySelectedRows.value = selectedIds
        .map((id: number) => categoryMap.value[id])
        .filter((item: CategoryOption | undefined): item is CategoryOption => Boolean(item))
    showCategories.value = true
    await nextTick()
    categoryTreeRef.value?.setCheckedKeys(categoryCheckedKeys.value, false)
    categoryTreeRef.value?.filter('')
}

/**
 * 保存页面分类配置。
 */
const handleSaveCategories = async () => {
    categoryLoading.value = true
    try {
        const categoryIconMap = categorySelectedRows.value.reduce(
            (result: Record<string, string>, item: CategoryOption) => {
                result[String(item.id)] = String(item.icon || '').trim()
                return result
            },
            {}
        )
        await uiedPageUpdateCategories({
            pageId: currentPageId.value,
            categoryIds: categorySelectedRows.value.map((item) => item.id),
            categoryIcons: categoryIconMap
        })
        feedback.msgSuccess('保存成功')
        showCategories.value = false
    } finally {
        categoryLoading.value = false
    }
}

/**
 * 行内快捷保存排序，降低页面管理维护成本。
 */
const handleQuickSortSave = async (row: any) => {
    const nextSort = Number(rowSortMap[row.id] ?? row.sortOrder ?? 0)
    if (!Number.isFinite(nextSort)) return
    if (Number(row.sortOrder || 0) === nextSort) return
    rowSortSavingMap[row.id] = true
    try {
        await uiedPageEdit({ id: row.id, sortOrder: nextSort })
        row.sortOrder = nextSort
        feedback.msgSuccess('排序已更新')
    } finally {
        rowSortSavingMap[row.id] = false
    }
}

watch(
    () => pager.lists,
    (rows) => {
        const rowList = Array.isArray(rows) ? rows : []
        rowList.forEach((item: any) => {
            rowSortMap[item.id] = Number(item.sortOrder || 0)
        })
    },
    { immediate: true, deep: true }
)

watch(
    () => editData.name,
    (value) => {
        if (editData.id) return
        if (slugTouched.value && String(editData.slug || '').trim()) return
        editData.slug = buildSlugFromName(String(value || ''))
    }
)

getLists()
</script>

<style scoped>
.scroll-websites-selector {
    width: 100%;
}

.category-add-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
}

.selected-websites-wrap {
    border: 1px solid var(--el-border-color-light);
    border-radius: 6px;
    padding: 12px;
    background: var(--el-fill-color-lighter);
}

.websites-count {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-bottom: 8px;
}

.websites-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.website-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    background: var(--el-bg-color);
    border-radius: 4px;
    border: 1px solid var(--el-border-color-lighter);
    font-size: 13px;
    cursor: move;
    transition: all 0.2s;
}

.website-tag:hover {
    border-color: var(--el-color-primary-light-5);
    background: var(--el-color-primary-light-9);
}

.website-tag .website-icon {
    width: 16px;
    height: 16px;
    border-radius: 3px;
    object-fit: cover;
}

.website-tag .website-name {
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.website-tag .remove-icon {
    color: var(--el-text-color-placeholder);
    cursor: pointer;
    font-size: 12px;
}

.website-tag .remove-icon:hover {
    color: var(--el-color-danger);
}

.empty-tip {
    color: var(--el-text-color-placeholder);
    font-size: 13px;
}

.page-sort-cell {
    display: flex;
    align-items: center;
    gap: 4px;
}

.page-category-config {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 16px;
}

.page-category-config__panel {
    border: 1px solid var(--el-border-color-light);
    border-radius: 8px;
    padding: 12px;
    min-height: 420px;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.page-category-config__panel-title {
    font-size: 13px;
    color: var(--el-text-color-primary);
    font-weight: 600;
}

.page-category-config__panel-title--with-action {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.page-category-config__tree {
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 6px;
    padding: 8px;
    flex: 1;
    overflow: auto;
}

.page-category-config__empty {
    height: 100%;
    min-height: 220px;
    border: 1px dashed var(--el-border-color);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--el-text-color-secondary);
    font-size: 13px;
    padding: 12px;
    text-align: center;
}

.page-category-config__selected-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow: auto;
}

.page-category-config__selected-item {
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    padding: 8px 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}

.page-category-config__selected-main {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
}

.page-category-config__selected-index {
    min-width: 22px;
    height: 22px;
    border-radius: 999px;
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
}

.page-category-config__selected-name {
    font-size: 13px;
    color: var(--el-text-color-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.page-category-config__selected-icon-wrap {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: 1px solid var(--el-border-color-lighter);
    background: var(--el-fill-color-lighter);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--el-text-color-secondary);
    flex-shrink: 0;
}

.page-category-config__selected-icon {
    font-size: 14px;
}

.page-category-config__selected-icon-empty {
    font-size: 10px;
}

.page-category-config__selected-icon-editor {
    min-width: 190px;
    max-width: 210px;
}

.page-category-config__selected-icon-editor :deep(.el-input) {
    width: 100%;
}

.page-category-config__selected-actions {
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

@media (max-width: 960px) {
    .page-category-config {
        grid-template-columns: 1fr;
    }
}
</style>
