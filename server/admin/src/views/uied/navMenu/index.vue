<!--
 * @file views/uied/navMenu/index.vue
 * @description UIED 导航菜单管理
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
-->
<template>
    <div class="nav-menu-lists">
        <div class="nav-menu-workspace">
            <el-card class="nav-menu-workspace__sidebar !border-none" shadow="never">
                <template #header>
                    <div class="nav-menu-quick-header">
                        <div class="nav-menu-quick-header__title">快速添加菜单项</div>
                        <div class="nav-menu-quick-header__desc">
                            先选择挂载位置，再按类型批量添加，操作更直观
                        </div>
                    </div>
                </template>
                <div class="nav-menu-quick-placement">
                    <div class="nav-menu-quick-placement__label">添加到</div>
                    <el-tree-select
                        v-model="currentQuickParentId"
                        :data="menuTreeOptions"
                        check-strictly
                        :render-after-expand="false"
                        placeholder="顶级菜单"
                        style="width: 100%"
                    />
                </div>
                <el-tabs v-model="quickAddTab">
                    <el-tab-pane label="自定义链接" name="custom">
                        <el-form label-width="72px">
                            <el-form-item label="菜单标题">
                                <el-input
                                    v-model="quickCustomForm.name"
                                    placeholder="例如：设计工具库"
                                />
                            </el-form-item>
                            <el-form-item label="链接地址">
                                <el-input
                                    v-model="quickCustomForm.url"
                                    placeholder="例如：/category/design"
                                />
                            </el-form-item>
                            <el-form-item label="新窗口">
                                <el-switch v-model="quickCustomForm.openInNewTab" />
                            </el-form-item>
                            <el-button
                                class="w-full"
                                type="primary"
                                :loading="quickAdding"
                                @click="handleQuickAddCustom"
                            >
                                添加到菜单
                            </el-button>
                        </el-form>
                    </el-tab-pane>

                    <el-tab-pane label="系统页面" name="builtin">
                        <el-form label-width="72px">
                            <el-form-item label="筛选">
                                <el-input
                                    v-model="quickBuiltinKeyword"
                                    clearable
                                    placeholder="搜索系统页面名称或路径"
                                />
                            </el-form-item>
                            <div class="nav-menu-quick-toolbar">
                                <span class="nav-menu-quick-toolbar__count">
                                    已选 {{ quickBuiltinKeys.length }} / {{ filteredBuiltinNavEntryOptions.length }}
                                </span>
                                <div class="nav-menu-quick-toolbar__actions">
                                    <el-button
                                        text
                                        type="primary"
                                        size="small"
                                        @click="handleSelectAllBuiltin"
                                    >
                                        全选
                                    </el-button>
                                    <el-button
                                        text
                                        size="small"
                                        @click="quickBuiltinKeys = []"
                                    >
                                        清空
                                    </el-button>
                                </div>
                            </div>
                            <div class="nav-menu-quick-list-wrap">
                                <el-checkbox-group
                                    v-model="quickBuiltinKeys"
                                    class="nav-menu-quick-check-group"
                                >
                                    <el-checkbox
                                        v-for="item in filteredBuiltinNavEntryOptions"
                                        :key="item.key"
                                        :label="item.key"
                                    >
                                        <div class="nav-menu-quick-check-item">
                                            <span class="nav-menu-quick-check-item__name">{{ item.label }}</span>
                                            <span class="nav-menu-quick-check-item__path">{{ item.defaultPath }}</span>
                                        </div>
                                    </el-checkbox>
                                </el-checkbox-group>
                                <el-empty
                                    v-if="filteredBuiltinNavEntryOptions.length === 0"
                                    :image-size="46"
                                    description="没有匹配的系统页面"
                                />
                            </div>
                            <el-button
                                class="w-full"
                                type="primary"
                                :loading="quickAdding"
                                :disabled="quickBuiltinKeys.length === 0"
                                @click="handleQuickAddBuiltin"
                            >
                                批量添加系统页面
                            </el-button>
                        </el-form>
                    </el-tab-pane>

                    <el-tab-pane label="分类入口" name="category">
                        <el-form label-width="72px">
                            <el-form-item label="筛选">
                                <el-input
                                    v-model="quickCategoryKeyword"
                                    clearable
                                    placeholder="搜索分类名称 / slug"
                                />
                            </el-form-item>
                            <div class="nav-menu-quick-toolbar">
                                <span class="nav-menu-quick-toolbar__count">
                                    已选 {{ quickCategoryIds.length }} / {{ filteredCategoryList.length }}
                                </span>
                                <div class="nav-menu-quick-toolbar__actions">
                                    <el-button
                                        text
                                        type="primary"
                                        size="small"
                                        @click="handleSelectAllCategory"
                                    >
                                        全选
                                    </el-button>
                                    <el-button
                                        text
                                        size="small"
                                        @click="quickCategoryIds = []"
                                    >
                                        清空
                                    </el-button>
                                </div>
                            </div>
                            <div class="nav-menu-quick-list-wrap">
                                <el-checkbox-group
                                    v-model="quickCategoryIds"
                                    class="nav-menu-quick-check-group"
                                >
                                    <el-checkbox
                                        v-for="item in filteredCategoryList"
                                        :key="item.id"
                                        :label="item.id"
                                    >
                                        <div class="nav-menu-quick-check-item">
                                            <span class="nav-menu-quick-check-item__name">{{ item.name }}</span>
                                            <span class="nav-menu-quick-check-item__path">
                                                /category/{{ item.slug || item.id }}
                                            </span>
                                        </div>
                                    </el-checkbox>
                                </el-checkbox-group>
                                <el-empty
                                    v-if="filteredCategoryList.length === 0"
                                    :image-size="46"
                                    description="没有匹配的分类"
                                />
                            </div>
                            <el-button
                                class="w-full"
                                type="primary"
                                :loading="quickAdding"
                                :disabled="quickCategoryIds.length === 0"
                                @click="handleQuickAddCategory"
                            >
                                批量添加分类入口
                            </el-button>
                        </el-form>
                    </el-tab-pane>
                </el-tabs>
                <div class="nav-menu-quick-tip">
                    提示：快速添加只负责新增，不会覆盖你已存在的菜单链接或层级。
                </div>
            </el-card>

            <el-card class="nav-menu-workspace__main !border-none" shadow="never">
                <div class="mb-4 flex justify-between items-center">
                    <div class="flex gap-4 items-center">
                        <el-button type="primary" @click="handleAdd(0)">
                            <template #icon><icon name="el-icon-Plus" /></template>
                            添加菜单
                        </el-button>
                        <div class="text-gray-500 text-sm">
                            共
                            <span class="text-primary font-medium">{{ totalMenus }}</span> 个菜单，
                            <span class="text-primary font-medium">{{ topLevelMenus }}</span>
                            个顶级分类
                        </div>
                    </div>
                    <div class="nav-menu-main-actions">
                        <el-button
                            :disabled="!hasPreviewSortChanges || sortSaving"
                            @click="handleResetPreviewSort"
                        >
                            撤销排序变更
                        </el-button>
                        <el-button
                            type="primary"
                            :disabled="!hasPreviewSortChanges"
                            :loading="sortSaving"
                            @click="handleSavePreviewSort"
                        >
                            保存排序
                        </el-button>
                    </div>
                </div>
                <div class="nav-menu-main-panels" v-loading="loading">
                    <div class="nav-menu-preview nav-menu-preview--full">
                        <div class="nav-menu-preview__header">
                            <div>
                                <div class="nav-menu-preview__title">
                                    前台菜单（可拖拽排序）
                                </div>
                                <div class="nav-menu-preview__desc">
                                    当前列表即为前台渲染顺序，拖拽后点击“保存排序”生效
                                </div>
                            </div>
                            <el-tag v-if="hasPreviewSortChanges" type="warning" size="small"
                                >未保存排序</el-tag
                            >
                            <el-tag v-else type="success" size="small">已保存</el-tag>
                        </div>
                        <div class="nav-menu-preview__body">
                            <Draggable
                                v-model="previewTree"
                                item-key="id"
                                handle=".nav-menu-preview-item__drag"
                                :animation="180"
                                ghost-class="nav-menu-preview-item--ghost"
                                class="nav-menu-preview-list"
                                @end="handlePreviewSortChanged"
                            >
                                <template #item="{ element }">
                                    <div class="nav-menu-preview-item">
                                        <div class="nav-menu-preview-item__row">
                                            <div class="nav-menu-preview-item__main">
                                                <span class="nav-menu-preview-item__drag">⋮⋮</span>
                                                <icon
                                                    v-if="resolveMenuIcon(element.icon)"
                                                    :name="resolveMenuIcon(element.icon)"
                                                    :size="15"
                                                />
                                                <span class="nav-menu-preview-item__name">{{
                                                    element.name
                                                }}</span>
                                                <el-tag
                                                    v-if="element.label"
                                                    :type="
                                                        element.labelType === 'shop'
                                                            ? 'success'
                                                            : 'info'
                                                    "
                                                    size="small"
                                                >
                                                    {{ element.label }}
                                                </el-tag>
                                                <el-tag
                                                    :type="
                                                        element.linkMode === 'builtin'
                                                            ? 'warning'
                                                            : 'info'
                                                    "
                                                    size="small"
                                                >
                                                    {{
                                                        element.linkMode === 'builtin'
                                                            ? '内置功能'
                                                            : '自定义'
                                                    }}
                                                </el-tag>
                                                <el-tag
                                                    :type="element.isActive ? 'success' : 'info'"
                                                    size="small"
                                                >
                                                    {{ element.isActive ? '显示' : '隐藏' }}
                                                </el-tag>
                                                <span class="nav-menu-preview-item__meta">{{
                                                    element.url || '-'
                                                }}</span>
                                            </div>
                                            <div class="nav-menu-preview-item__actions">
                                                <el-tag size="small" effect="plain">
                                                    排序 {{ Number(element.sortOrder || 0) }}
                                                </el-tag>
                                                <el-tag
                                                    size="small"
                                                    effect="plain"
                                                    :type="
                                                        element.openInNewTab ? 'success' : 'info'
                                                    "
                                                >
                                                    {{
                                                        element.openInNewTab
                                                            ? '新窗口'
                                                            : '本窗口'
                                                    }}
                                                </el-tag>
                                                <el-button
                                                    type="primary"
                                                    link
                                                    @click.stop="handleAdd(element.id)"
                                                >
                                                    添加子菜单
                                                </el-button>
                                                <el-button
                                                    type="primary"
                                                    link
                                                    @click.stop="handleEdit(element)"
                                                >
                                                    编辑
                                                </el-button>
                                                <el-button
                                                    type="danger"
                                                    link
                                                    @click.stop="handleDelete(element.id)"
                                                >
                                                    删除
                                                </el-button>
                                            </div>
                                        </div>
                                        <Draggable
                                            v-if="
                                                Array.isArray(element.children) &&
                                                element.children.length > 0
                                            "
                                            v-model="element.children"
                                            item-key="id"
                                            handle=".nav-menu-preview-item__drag"
                                            :animation="180"
                                            ghost-class="nav-menu-preview-item--ghost"
                                            class="nav-menu-preview-child-list"
                                            @end="handlePreviewSortChanged"
                                        >
                                            <template #item="{ element: child }">
                                                <div
                                                    class="nav-menu-preview-item nav-menu-preview-item--child"
                                                >
                                                    <div class="nav-menu-preview-item__row">
                                                        <div class="nav-menu-preview-item__main">
                                                            <span
                                                                class="nav-menu-preview-item__drag"
                                                                >⋮⋮</span
                                                            >
                                                            <icon
                                                                v-if="resolveMenuIcon(child.icon)"
                                                                :name="
                                                                    resolveMenuIcon(child.icon)
                                                                "
                                                                :size="14"
                                                            />
                                                            <span
                                                                class="nav-menu-preview-item__name"
                                                                >{{ child.name }}</span
                                                            >
                                                            <el-tag
                                                                v-if="child.label"
                                                                :type="
                                                                    child.labelType === 'shop'
                                                                        ? 'success'
                                                                        : 'info'
                                                                "
                                                                size="small"
                                                            >
                                                                {{ child.label }}
                                                            </el-tag>
                                                            <el-tag
                                                                :type="
                                                                    child.linkMode === 'builtin'
                                                                        ? 'warning'
                                                                        : 'info'
                                                                "
                                                                size="small"
                                                            >
                                                                {{
                                                                    child.linkMode === 'builtin'
                                                                        ? '内置功能'
                                                                        : '自定义'
                                                                }}
                                                            </el-tag>
                                                            <span
                                                                class="nav-menu-preview-item__meta"
                                                                >{{ child.url || '-' }}</span
                                                            >
                                                        </div>
                                                        <div
                                                            class="nav-menu-preview-item__actions"
                                                        >
                                                            <el-tag size="small" effect="plain">
                                                                排序
                                                                {{
                                                                    Number(
                                                                        child.sortOrder || 0
                                                                    )
                                                                }}
                                                            </el-tag>
                                                            <el-tag
                                                                size="small"
                                                                effect="plain"
                                                                :type="
                                                                    child.openInNewTab
                                                                        ? 'success'
                                                                        : 'info'
                                                                "
                                                            >
                                                                {{
                                                                    child.openInNewTab
                                                                        ? '新窗口'
                                                                        : '本窗口'
                                                                }}
                                                            </el-tag>
                                                            <el-button
                                                                type="primary"
                                                                link
                                                                @click.stop="handleAdd(child.id)"
                                                            >
                                                                添加子菜单
                                                            </el-button>
                                                            <el-button
                                                                type="primary"
                                                                link
                                                                @click.stop="handleEdit(child)"
                                                            >
                                                                编辑
                                                            </el-button>
                                                            <el-button
                                                                type="danger"
                                                                link
                                                                @click.stop="
                                                                    handleDelete(child.id)
                                                                "
                                                            >
                                                                删除
                                                            </el-button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </template>
                                        </Draggable>
                                    </div>
                                </template>
                            </Draggable>
                            <el-empty
                                v-if="previewTree.length === 0"
                                description="暂无菜单，可先在左侧快速添加"
                                :image-size="72"
                            />
                        </div>
                    </div>
                </div>
            </el-card>
        </div>

        <!-- 编辑弹窗 -->
        <el-dialog v-model="showEdit" :title="editData.id ? '编辑菜单' : '添加菜单'" width="500px">
            <el-form ref="editFormRef" :model="editData" :rules="editRules" label-width="80px">
                <el-form-item label="上级菜单">
                    <el-tree-select
                        v-model="editData.parentId"
                        :data="menuTreeOptions"
                        check-strictly
                        :render-after-expand="false"
                        placeholder="顶级菜单"
                        style="width: 100%"
                    />
                </el-form-item>
                <el-form-item label="菜单名称" prop="name">
                    <el-input v-model="editData.name" placeholder="请输入菜单名称" />
                </el-form-item>
                <el-form-item label="链接类型">
                    <el-radio-group v-model="editData.linkMode">
                        <el-radio label="custom">自定义链接</el-radio>
                        <el-radio label="builtin">内置功能</el-radio>
                    </el-radio-group>
                </el-form-item>
                <el-form-item
                    v-if="editData.linkMode === 'builtin'"
                    label="内置功能"
                    prop="builtinKey"
                >
                    <el-select
                        v-model="editData.builtinKey"
                        placeholder="请选择内置功能"
                        style="width: 100%"
                    >
                        <el-option
                            v-for="item in builtinNavEntryOptions"
                            :key="item.key"
                            :label="item.label"
                            :value="item.key"
                        />
                    </el-select>
                    <div class="text-xs text-gray-400 mt-1">
                        运营只需配置标题/标签/排序，路径由系统自动维护
                        <span v-if="builtinLinkPreview"
                            >（当前预览：{{ builtinLinkPreview }}）</span
                        >
                    </div>
                </el-form-item>
                <el-form-item v-else label="链接地址">
                    <el-input v-model="editData.url" placeholder="请输入链接地址" />
                </el-form-item>
                <el-form-item label="图标">
                    <div class="w-full">
                        <icon-picker v-model="editData.icon" />
                        <div class="text-xs text-gray-400 mt-1">
                            推荐使用图标选择器，系统会自动保存标准图标名
                        </div>
                    </div>
                </el-form-item>
                <el-form-item label="排序">
                    <el-input-number v-model="editData.sortOrder" :min="0" />
                </el-form-item>
                <el-form-item label="标签">
                    <el-input v-model="editData.label" placeholder="如: New, 热门" />
                </el-form-item>
                <el-form-item label="标签类型">
                    <el-select
                        v-model="editData.labelType"
                        placeholder="选择标签样式"
                        clearable
                        style="width: 100%"
                    >
                        <el-option label="信息(蓝色)" value="info" />
                        <el-option label="成功(绿色)" value="shop" />
                        <el-option label="警告(橙色)" value="warning" />
                        <el-option label="危险(红色)" value="danger" />
                    </el-select>
                </el-form-item>
                <el-form-item label="新窗口">
                    <el-switch v-model="editData.openInNewTab" />
                </el-form-item>
                <el-form-item label="状态">
                    <el-switch v-model="editData.isActive" />
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

<script lang="ts" setup name="uiedNavMenu">
import {
    uiedCategoryAll,
    uiedNavMenuAll,
    uiedNavMenuAdd,
    uiedNavMenuEdit,
    uiedNavMenuDelete,
    uiedNavMenuSort
} from '@/api/uied'
import Draggable from 'vuedraggable'
import feedback from '@/utils/feedback'
import type { FormInstance, FormRules } from 'element-plus'
import {
    EL_ICON_PREFIX,
    LOCAL_ICON_PREFIX,
    getElementPlusIconNames,
    getLocalIconNames
} from '@/components/icon'

interface NavMenuItem {
    id: number
    parentId: number
    name: string
    text?: string
    url: string
    link?: string
    icon: string
    sortOrder: number
    sort?: number
    label: string
    labelType: string
    openInNewTab: boolean
    external?: boolean
    isActive: boolean
    isShow?: boolean
    builtinKey?: string
    linkMode?: 'custom' | 'builtin'
    children?: NavMenuItem[]
}

interface BuiltinNavEntryOption {
    key: string
    label: string
    defaultPath: string
}

interface CategoryOption {
    id: number
    name: string
    slug?: string
}

const loading = ref(false)
const menuTree = ref<NavMenuItem[]>([])
const previewTree = ref<NavMenuItem[]>([])
const sortSaving = ref(false)
const menuTreeOptions = ref<any[]>([])
const iconNameSet = new Set<string>([...getElementPlusIconNames(), ...getLocalIconNames()])
const builtinNavEntryOptions: BuiltinNavEntryOption[] = [
    { key: 'daily_hot', label: '每日热榜', defaultPath: '/p/daily-hot' },
    { key: 'daily_new', label: '每日上新', defaultPath: '/p/daily-new' },
    { key: 'hot_articles', label: '热门文章', defaultPath: '/p/hot' },
    { key: 'rankings', label: '热门榜单', defaultPath: '/p/rankings' },
    { key: 'submit', label: '投稿入口', defaultPath: '/submit' },
    { key: 'articles', label: '文章频道', defaultPath: '/articles' }
]
const categoryList = ref<CategoryOption[]>([])
const quickAddTab = ref<'custom' | 'builtin' | 'category'>('custom')
const quickAdding = ref(false)
const quickBuiltinKeyword = ref('')
const quickCategoryKeyword = ref('')
const quickCustomForm = reactive({
    name: '',
    url: '',
    parentId: 0,
    openInNewTab: false
})
const quickBuiltinParentId = ref(0)
const quickBuiltinKeys = ref<string[]>([])
const quickCategoryParentId = ref(0)
const quickCategoryIds = ref<number[]>([])

// 计算菜单统计
const totalMenus = computed(() => {
    const countMenus = (items: any[]): number => {
        return items.reduce((sum, item) => sum + 1 + countMenus(item.children || []), 0)
    }
    return countMenus(menuTree.value)
})

const topLevelMenus = computed(() => menuTree.value.length)
const hasPreviewSortChanges = computed(
    () => buildSortSignature(previewTree.value) !== buildSortSignature(menuTree.value)
)

/**
 * 根据当前添加模式绑定统一的“上级菜单”选择值。
 */
const currentQuickParentId = computed<number>({
    get: () => {
        if (quickAddTab.value === 'builtin') return quickBuiltinParentId.value
        if (quickAddTab.value === 'category') return quickCategoryParentId.value
        return Number(quickCustomForm.parentId || 0)
    },
    set: (value) => {
        const normalized = Number(value || 0)
        if (quickAddTab.value === 'builtin') {
            quickBuiltinParentId.value = normalized
            return
        }
        if (quickAddTab.value === 'category') {
            quickCategoryParentId.value = normalized
            return
        }
        quickCustomForm.parentId = normalized
    }
})

/**
 * 按关键词筛选系统页面项。
 */
const filteredBuiltinNavEntryOptions = computed(() => {
    const keyword = String(quickBuiltinKeyword.value || '')
        .trim()
        .toLowerCase()
    if (!keyword) return builtinNavEntryOptions
    return builtinNavEntryOptions.filter((item) => {
        const text = `${item.label} ${item.defaultPath} ${item.key}`.toLowerCase()
        return text.includes(keyword)
    })
})

/**
 * 按关键词筛选分类入口项。
 */
const filteredCategoryList = computed(() => {
    const keyword = String(quickCategoryKeyword.value || '')
        .trim()
        .toLowerCase()
    if (!keyword) return categoryList.value
    return categoryList.value.filter((item) => {
        const text = `${item.name} ${item.slug || ''} ${item.id}`.toLowerCase()
        return text.includes(keyword)
    })
})

const showEdit = ref(false)
const editLoading = ref(false)
const editFormRef = ref<FormInstance>()
const editData = reactive({
    id: 0,
    parentId: 0,
    name: '',
    linkMode: 'custom' as 'custom' | 'builtin',
    builtinKey: '',
    url: '',
    icon: '',
    sortOrder: 0,
    label: '',
    labelType: '',
    openInNewTab: false,
    isActive: true
})
const editRules: FormRules = {
    name: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
    builtinKey: [
        {
            validator: (_rule, value, callback) => {
                if (editData.linkMode === 'builtin' && !String(value || '').trim()) {
                    callback(new Error('请选择内置功能'))
                    return
                }
                callback()
            },
            trigger: 'change'
        }
    ]
}

/**
 * 获取内置入口默认路径（用于内置功能模式自动回填）
 */
const getBuiltinDefaultPath = (builtinKey?: string): string => {
    const option = builtinNavEntryOptions.find(
        (item) => item.key === String(builtinKey || '').trim()
    )
    return option?.defaultPath || ''
}

/**
 * 内置入口路径预览
 */
const builtinLinkPreview = computed(() => {
    if (editData.linkMode !== 'builtin') return ''
    return getBuiltinDefaultPath(editData.builtinKey)
})

/**
 * 解析并规范化图标名称，兼容历史无前缀图标值
 */
const normalizeIconName = (icon?: string): string => {
    if (!icon) return ''
    const iconName = String(icon).trim()
    if (!iconName) return ''
    if (iconName.startsWith(EL_ICON_PREFIX) || iconName.startsWith(LOCAL_ICON_PREFIX))
        return iconName
    return `${EL_ICON_PREFIX}${iconName}`
}

/**
 * 获取可安全渲染的图标名，避免无效图标导致组件渲染异常
 */
const resolveMenuIcon = (icon?: string): string => {
    const normalized = normalizeIconName(icon)
    return iconNameSet.has(normalized) ? normalized : ''
}

/**
 * 拉取网站分类（用于“分类入口”批量添加）
 */
const getCategoryList = async () => {
    try {
        const res = await uiedCategoryAll()
        categoryList.value = (Array.isArray(res) ? res : res || []).map((item: any) => ({
            id: Number(item.id || 0),
            name: String(item.name || ''),
            slug: String(item.slug || '')
        }))
    } catch (error: any) {
        feedback.msgError(error?.msg || error?.message || '获取分类列表失败')
    }
}

/**
 * 获取批量添加时使用的父级菜单 ID
 */
const normalizeParentId = (value: unknown) => Number(value || 0) || 0

/**
 * 批量添加菜单项（仅新增，不修改已有菜单链接）
 */
const batchAddMenuItems = async (items: Array<Record<string, any>>) => {
    if (!items.length) return
    quickAdding.value = true
    try {
        for (const item of items) {
            await uiedNavMenuAdd(item)
        }
        await getLists()
    } catch (error: any) {
        feedback.msgError(error?.msg || error?.message || '批量添加菜单失败')
        throw error
    } finally {
        quickAdding.value = false
    }
}

/**
 * 快速添加：系统页面全选
 */
const handleSelectAllBuiltin = () => {
    quickBuiltinKeys.value = filteredBuiltinNavEntryOptions.value.map((item) => item.key)
}

/**
 * 快速添加：分类入口全选
 */
const handleSelectAllCategory = () => {
    quickCategoryIds.value = filteredCategoryList.value.map((item) => Number(item.id))
}

/**
 * 快速添加：自定义链接
 */
const handleQuickAddCustom = async () => {
    const name = String(quickCustomForm.name || '').trim()
    const url = String(quickCustomForm.url || '').trim()
    if (!name) {
        feedback.msgWarning('请输入菜单标题')
        return
    }
    if (!url) {
        feedback.msgWarning('请输入链接地址')
        return
    }
    await batchAddMenuItems([
        {
            name,
            url,
            parentId: normalizeParentId(quickCustomForm.parentId),
            openInNewTab: quickCustomForm.openInNewTab,
            external: quickCustomForm.openInNewTab,
            isActive: true,
            isShow: true,
            linkMode: 'custom'
        }
    ])
    quickCustomForm.name = ''
    quickCustomForm.url = ''
    quickCustomForm.openInNewTab = false
    feedback.msgSuccess('菜单已添加')
}

/**
 * 快速添加：系统页面入口
 */
const handleQuickAddBuiltin = async () => {
    const keys = quickBuiltinKeys.value.filter(Boolean)
    if (!keys.length) {
        feedback.msgWarning('请先选择系统页面')
        return
    }
    const parentId = normalizeParentId(quickBuiltinParentId.value)
    const selected = builtinNavEntryOptions.filter((item) => keys.includes(item.key))
    await batchAddMenuItems(
        selected.map((item) => ({
            name: item.label,
            parentId,
            builtinKey: item.key,
            linkMode: 'builtin',
            url: item.defaultPath,
            isActive: true,
            isShow: true
        }))
    )
    quickBuiltinKeys.value = []
    feedback.msgSuccess(`已添加 ${selected.length} 个系统页面入口`)
}

/**
 * 快速添加：分类入口
 */
const handleQuickAddCategory = async () => {
    const ids = quickCategoryIds.value.map((item) => Number(item)).filter((item) => item > 0)
    if (!ids.length) {
        feedback.msgWarning('请先选择分类')
        return
    }
    const parentId = normalizeParentId(quickCategoryParentId.value)
    const selected = categoryList.value.filter((item) => ids.includes(Number(item.id)))
    await batchAddMenuItems(
        selected.map((item) => ({
            name: item.name,
            parentId,
            linkMode: 'custom',
            url: `/category/${String(item.slug || item.id)}`,
            isActive: true,
            isShow: true
        }))
    )
    quickCategoryIds.value = []
    feedback.msgSuccess(`已添加 ${selected.length} 个分类入口`)
}

/**
 * 递归规范化菜单树节点，确保子节点也能正确显示图标与链接类型
 */
const normalizeMenuTreeItems = (items: NavMenuItem[]): NavMenuItem[] =>
    (Array.isArray(items) ? items : []).map((item) => ({
        ...item,
        icon: normalizeIconName(item.icon),
        linkMode: item.builtinKey ? 'builtin' : 'custom',
        children: normalizeMenuTreeItems(item.children || [])
    }))

/**
 * 深拷贝菜单树，避免预览拖拽直接污染原始数据。
 */
const cloneMenuTree = (items: NavMenuItem[]): NavMenuItem[] =>
    JSON.parse(JSON.stringify(items || []))

/**
 * 递归重排 sortOrder，确保拖拽后同级排序连续且稳定。
 */
const normalizeSortOrders = (items: NavMenuItem[], parentId = 0): void => {
    ;(Array.isArray(items) ? items : []).forEach((item, index) => {
        item.parentId = parentId
        item.sortOrder = (index + 1) * 10
        normalizeSortOrders(item.children || [], Number(item.id || 0))
    })
}

/**
 * 生成菜单排序签名，用于判断预览区是否存在未保存变更。
 */
const buildSortSignature = (items: NavMenuItem[]): string => {
    const rows: string[] = []
    const walk = (list: NavMenuItem[], parentId = 0) => {
        ;(Array.isArray(list) ? list : []).forEach((item, index) => {
            rows.push(`${item.id}:${parentId}:${index}`)
            walk(item.children || [], Number(item.id || 0))
        })
    }
    walk(items, 0)
    return rows.join('|')
}

/**
 * 展平排序保存 payload（仅提交 id + sortOrder）。
 */
const flattenSortItems = (
    items: NavMenuItem[]
): Array<{ id: number; sortOrder: number; parentId: number }> => {
    const result: Array<{ id: number; sortOrder: number; parentId: number }> = []
    const walk = (list: NavMenuItem[], parentId = 0) => {
        ;(Array.isArray(list) ? list : []).forEach((item) => {
            result.push({
                id: Number(item.id),
                sortOrder: Number(item.sortOrder || 0),
                parentId: Number(parentId || 0)
            })
            walk(item.children || [], Number(item.id || 0))
        })
    }
    walk(items, 0)
    return result
}

/**
 * 同步右侧预览数据。
 */
const syncPreviewTree = () => {
    previewTree.value = cloneMenuTree(menuTree.value)
    normalizeSortOrders(previewTree.value, 0)
}

/**
 * 获取导航菜单树数据
 */
const getLists = async () => {
    loading.value = true
    try {
        const res = await uiedNavMenuAll()
        // request interceptor 已解包 data，res 直接就是数组
        menuTree.value = normalizeMenuTreeItems(
            (Array.isArray(res) ? res : res || []) as NavMenuItem[]
        )
        menuTreeOptions.value = [
            { value: 0, label: '顶级菜单' },
            ...buildTreeOptions(menuTree.value)
        ]
        syncPreviewTree()
    } catch (error: any) {
        feedback.msgError(error?.msg || error?.message || '获取导航菜单失败')
    } finally {
        loading.value = false
    }
}

/**
 * 构建树形选择数据
 */
const buildTreeOptions = (items: NavMenuItem[]): any[] => {
    return items.map((item) => ({
        value: item.id,
        label: item.name,
        children: item.children?.length ? buildTreeOptions(item.children) : undefined
    }))
}

/**
 * 重置编辑表单数据
 */
const resetEditData = () =>
    Object.assign(editData, {
        id: 0,
        parentId: 0,
        name: '',
        linkMode: 'custom',
        builtinKey: '',
        url: '',
        icon: '',
        sortOrder: 0,
        label: '',
        labelType: '',
        openInNewTab: false,
        isActive: true
    })

/**
 * 打开新增菜单弹窗
 */
const handleAdd = (parentId: number) => {
    resetEditData()
    editData.parentId = parentId
    showEdit.value = true
}

/**
 * 打开编辑菜单弹窗
 */
const handleEdit = (row: NavMenuItem) => {
    resetEditData()
    const builtinKey = String(row.builtinKey || '').trim()
    editData.id = Number(row.id || 0)
    editData.parentId = normalizeParentId(row.parentId)
    editData.name = String(row.name || row.text || '').trim()
    editData.linkMode = builtinKey ? 'builtin' : 'custom'
    editData.builtinKey = builtinKey
    editData.url = String(row.url || row.link || '').trim()
    editData.icon = normalizeIconName(row.icon)
    editData.sortOrder = Number(row.sortOrder ?? row.sort ?? 0) || 0
    editData.label = String(row.label || '').trim()
    editData.labelType = String(row.labelType || '').trim()
    editData.openInNewTab = Boolean(row.openInNewTab ?? row.external ?? false)
    editData.isActive = Boolean(row.isActive ?? row.isShow ?? true)
    showEdit.value = true
}

/**
 * 当链接类型切换为内置功能时，同步默认路径（仅做回填预览/保存兜底）
 */
watch(
    () => [editData.linkMode, editData.builtinKey],
    ([linkMode]) => {
        if (linkMode !== 'builtin') return
        const defaultPath = getBuiltinDefaultPath(editData.builtinKey)
        if (defaultPath) {
            editData.url = defaultPath
        }
    },
    { immediate: false }
)

/**
 * 提交菜单编辑数据
 */
const handleSubmit = async () => {
    await editFormRef.value?.validate()
    editLoading.value = true
    try {
        const normalizedName = String(editData.name || '').trim()
        const normalizedBuiltinKey =
            editData.linkMode === 'builtin' ? String(editData.builtinKey || '').trim() : ''
        const normalizedUrl =
            editData.linkMode === 'builtin'
                ? getBuiltinDefaultPath(normalizedBuiltinKey) || String(editData.url || '').trim()
                : String(editData.url || '').trim()
        const submitData = {
            id: Number(editData.id || 0),
            parentId: Number(editData.parentId || 0),
            name: normalizedName,
            text: normalizedName,
            linkMode: editData.linkMode,
            builtinKey: normalizedBuiltinKey,
            url: normalizedUrl,
            link: normalizedUrl,
            icon: normalizeIconName(editData.icon),
            sortOrder: Number(editData.sortOrder || 0),
            sort: Number(editData.sortOrder || 0),
            label: String(editData.label || '').trim(),
            labelType: String(editData.labelType || '').trim(),
            openInNewTab: Boolean(editData.openInNewTab),
            isShow: editData.isActive,
            isActive: Boolean(editData.isActive),
            external: Boolean(editData.openInNewTab)
        }
        if (editData.id) {
            await uiedNavMenuEdit(submitData)
            feedback.msgSuccess('编辑成功')
        } else {
            await uiedNavMenuAdd(submitData)
            feedback.msgSuccess('添加成功')
        }
        showEdit.value = false
        await getLists()
    } catch (error: any) {
        feedback.msgError(error?.msg || error?.message || '保存菜单失败')
    } finally {
        editLoading.value = false
    }
}

/**
 * 删除菜单
 */
const handleDelete = async (id: number) => {
    await feedback.confirm('确定要删除该菜单吗？子菜单也会被删除')
    await uiedNavMenuDelete({ id })
    feedback.msgSuccess('删除成功')
    await getLists()
}

/**
 * 拖拽结束后更新本地预览排序值。
 */
const handlePreviewSortChanged = () => {
    normalizeSortOrders(previewTree.value, 0)
}

/**
 * 保存拖拽排序到后端。
 */
const handleSavePreviewSort = async () => {
    if (!hasPreviewSortChanges.value) {
        feedback.msgWarning('当前没有需要保存的排序变更')
        return
    }
    sortSaving.value = true
    try {
        normalizeSortOrders(previewTree.value, 0)
        await uiedNavMenuSort({ items: flattenSortItems(previewTree.value) })
        feedback.msgSuccess('排序保存成功')
        await getLists()
    } catch (error: any) {
        feedback.msgError(error?.msg || error?.message || '排序保存失败')
    } finally {
        sortSaving.value = false
    }
}

/**
 * 撤销未保存排序，回退为当前后端已保存顺序。
 */
const handleResetPreviewSort = () => {
    if (!hasPreviewSortChanges.value) return
    syncPreviewTree()
}

getLists()
getCategoryList()
</script>

<style scoped>
.nav-menu-workspace {
    display: grid;
    grid-template-columns: minmax(300px, 340px) minmax(0, 1fr);
    gap: 12px;
}

.nav-menu-main-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.nav-menu-main-panels {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 12px;
}

.nav-menu-quick-header__title {
    font-size: 14px;
    font-weight: 600;
    line-height: 1.2;
}

.nav-menu-quick-header__desc {
    margin-top: 4px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    line-height: 1.4;
}

.nav-menu-quick-placement {
    margin-bottom: 12px;
    padding: 10px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    background: var(--el-fill-color-blank);
}

.nav-menu-quick-placement__label {
    margin-bottom: 6px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

.nav-menu-quick-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: -2px 0 8px;
}

.nav-menu-quick-toolbar__count {
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

.nav-menu-quick-toolbar__actions {
    display: flex;
    align-items: center;
    gap: 4px;
}

.nav-menu-quick-list-wrap {
    max-height: 260px;
    overflow: auto;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    padding: 8px 10px;
    margin-bottom: 10px;
    background: #fff;
}

.nav-menu-quick-check-group {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.nav-menu-quick-check-item {
    display: inline-flex;
    flex-direction: column;
    gap: 2px;
    line-height: 1.25;
}

.nav-menu-quick-check-item__name {
    font-size: 13px;
    color: var(--el-text-color-primary);
}

.nav-menu-quick-check-item__path {
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

.nav-menu-quick-tip {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px dashed var(--el-border-color-light);
    font-size: 12px;
    line-height: 1.5;
    color: var(--el-text-color-secondary);
}

.nav-menu-preview {
    border: 1px solid var(--el-border-color-light);
    border-radius: 10px;
    background: #fff;
    min-height: 420px;
    display: flex;
    flex-direction: column;
}

.nav-menu-preview--full {
    min-height: 520px;
}

.nav-menu-preview__header {
    padding: 12px;
    border-bottom: 1px solid var(--el-border-color-lighter);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}

.nav-menu-preview__title {
    font-size: 13px;
    font-weight: 600;
    color: var(--el-text-color-primary);
}

.nav-menu-preview__desc {
    margin-top: 4px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

.nav-menu-preview__body {
    flex: 1;
    padding: 10px;
    overflow: auto;
}

.nav-menu-preview-list,
.nav-menu-preview-child-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.nav-menu-preview-child-list {
    margin-top: 8px;
    margin-left: 26px;
}

.nav-menu-preview-item {
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    padding: 8px 10px;
    background: #fff;
}

.nav-menu-preview-item--child {
    background: #fafafa;
}

.nav-menu-preview-item__main {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex-wrap: wrap;
}

.nav-menu-preview-item__drag {
    width: 20px;
    text-align: center;
    color: var(--el-text-color-secondary);
    cursor: move;
    user-select: none;
}

.nav-menu-preview-item__name {
    font-size: 13px;
    color: var(--el-text-color-primary);
    font-weight: 500;
    flex-shrink: 0;
}

.nav-menu-preview-item__meta {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    max-width: 320px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.nav-menu-preview-item__row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
}

.nav-menu-preview-item__actions {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: flex-end;
    flex-shrink: 0;
}

:deep(.nav-menu-preview-item--ghost) {
    opacity: 0.65;
    background: #f5f7fa !important;
    border-color: var(--el-color-primary-light-5) !important;
}

@media (max-width: 1280px) {
    .nav-menu-workspace {
        grid-template-columns: minmax(0, 1fr);
    }
    .nav-menu-main-panels {
        grid-template-columns: minmax(0, 1fr);
    }
    .nav-menu-preview-item__row {
        flex-direction: column;
    }
    .nav-menu-preview-item__actions {
        justify-content: flex-start;
    }
    .nav-menu-preview-item__meta {
        max-width: 100%;
    }
}
</style>
