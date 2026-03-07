<!--
 * @file views/uied/footer/index.vue
 * @description UIED 页脚设置管理
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
-->
<template>
    <div class="footer-setting">
        <el-card class="!border-none" shadow="never">
            <el-tabs v-model="activeTab">
                <!-- 页脚分组 -->
                <el-tab-pane label="页脚分组" name="groups">
                    <div class="mb-4">
                        <el-button type="primary" @click="handleAddGroup">
                            <template #icon><icon name="el-icon-Plus" /></template>
                            添加分组
                        </el-button>
                    </div>
                    <el-table size="large" v-loading="groupPager.loading" :data="groupPager.lists">
                        <el-table-column label="ID" prop="id" width="80" />
                        <el-table-column label="分组名称" prop="name" min-width="150" />
                        <el-table-column label="排序" prop="sortOrder" width="80" />
                        <el-table-column label="状态" width="80">
                            <template #default="{ row }">
                                <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
                                    {{ row.isActive ? '显示' : '隐藏' }}
                                </el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="操作" width="120" fixed="right">
                            <template #default="{ row }">
                                <el-button type="primary" link @click="handleEditGroup(row)"
                                    >编辑</el-button
                                >
                                <el-button type="danger" link @click="handleDeleteGroup(row.id)"
                                    >删除</el-button
                                >
                            </template>
                        </el-table-column>
                    </el-table>
                </el-tab-pane>

                <!-- 页脚链接 -->
                <el-tab-pane label="页脚链接" name="links">
                    <div class="mb-4 flex gap-4">
                        <el-button type="primary" @click="handleAddLink">
                            <template #icon><icon name="el-icon-Plus" /></template>
                            添加链接
                        </el-button>
                        <el-select
                            v-model="linkGroupFilter"
                            placeholder="筛选分组"
                            clearable
                            @change="getLinkLists"
                        >
                            <el-option
                                v-for="g in groupOptions"
                                :key="g.id"
                                :label="g.name"
                                :value="g.id"
                            />
                        </el-select>
                    </div>
                    <el-table size="large" v-loading="linkPager.loading" :data="linkPager.lists">
                        <el-table-column label="ID" prop="id" width="80" />
                        <el-table-column label="所属分组" prop="groupName" width="120" />
                        <el-table-column label="链接名称" prop="name" min-width="150" />
                        <el-table-column
                            label="链接地址"
                            prop="url"
                            min-width="200"
                            show-overflow-tooltip
                        />
                        <el-table-column label="链接类型" width="100">
                            <template #default="{ row }">
                                <el-tag
                                    :type="row.linkMode === 'builtin' ? 'warning' : 'info'"
                                    size="small"
                                >
                                    {{ row.linkMode === 'builtin' ? '内置功能' : '自定义' }}
                                </el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="排序" prop="sortOrder" width="80" />
                        <el-table-column label="状态" width="80">
                            <template #default="{ row }">
                                <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
                                    {{ row.isActive ? '显示' : '隐藏' }}
                                </el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="操作" width="120" fixed="right">
                            <template #default="{ row }">
                                <el-button type="primary" link @click="handleEditLink(row)"
                                    >编辑</el-button
                                >
                                <el-button type="danger" link @click="handleDeleteLink(row.id)"
                                    >删除</el-button
                                >
                            </template>
                        </el-table-column>
                    </el-table>
                    <div class="flex justify-end mt-4">
                        <pagination v-model="linkPager" @change="getLinkLists" />
                    </div>
                </el-tab-pane>

                <!-- 关于区域 -->
                <el-tab-pane label="关于区域" name="about">
                    <el-form :model="footerAboutData" label-width="120px" class="max-w-[760px]">
                        <el-form-item label="标题">
                            <el-input
                                v-model="footerAboutData.aboutTitle"
                                placeholder="例如：UIED设计导航"
                            />
                        </el-form-item>
                        <el-form-item label="桌面端简介">
                            <el-input
                                v-model="footerAboutData.aboutDescription"
                                type="textarea"
                                :rows="5"
                                placeholder="页脚左侧关于区域的完整介绍文案"
                            />
                        </el-form-item>
                        <el-form-item label="移动端简介">
                            <el-input
                                v-model="footerAboutData.mobileDescription"
                                type="textarea"
                                :rows="3"
                                placeholder="移动端折叠区域展示的简短文案"
                            />
                        </el-form-item>
                        <el-divider content-position="left">提交网站按钮</el-divider>
                        <el-form-item label="显示按钮">
                            <el-switch v-model="footerAboutData.showSubmitButton" />
                        </el-form-item>
                        <el-form-item label="按钮文字" v-if="footerAboutData.showSubmitButton">
                            <el-input
                                v-model="footerAboutData.submitButtonText"
                                placeholder="例如：提交网站"
                            />
                        </el-form-item>
                        <el-form-item label="按钮链接" v-if="footerAboutData.showSubmitButton">
                            <el-input
                                v-model="footerAboutData.submitButtonUrl"
                                placeholder="/submit 或 https://example.com/submit"
                            />
                        </el-form-item>
                        <el-form-item label="新窗口打开" v-if="footerAboutData.showSubmitButton">
                            <el-switch v-model="footerAboutData.submitButtonNewWindow" />
                        </el-form-item>

                        <el-divider content-position="left">更新记录按钮</el-divider>
                        <el-form-item label="显示按钮">
                            <el-switch v-model="footerAboutData.showChangelogButton" />
                        </el-form-item>
                        <el-form-item label="按钮文字" v-if="footerAboutData.showChangelogButton">
                            <el-input
                                v-model="footerAboutData.changelogButtonText"
                                placeholder="例如：更新记录"
                            />
                        </el-form-item>
                        <el-form-item label="按钮链接" v-if="footerAboutData.showChangelogButton">
                            <el-input
                                v-model="footerAboutData.changelogButtonUrl"
                                placeholder="/changelog 或 https://example.com/changelog"
                            />
                        </el-form-item>
                        <el-form-item
                            label="新窗口打开"
                            v-if="footerAboutData.showChangelogButton"
                        >
                            <el-switch v-model="footerAboutData.changelogButtonNewWindow" />
                        </el-form-item>

                        <el-form-item>
                            <el-button @click="handleResetFooterAbout">重置默认</el-button>
                            <el-button
                                type="primary"
                                :loading="footerAboutLoading"
                                @click="handleSaveFooterAbout"
                                >保存关于区域</el-button
                            >
                        </el-form-item>
                    </el-form>
                </el-tab-pane>
            </el-tabs>
        </el-card>

        <!-- 分组编辑弹窗 -->
        <el-dialog
            v-model="showGroupEdit"
            :title="groupData.id ? '编辑分组' : '添加分组'"
            width="400px"
        >
            <el-form ref="groupFormRef" :model="groupData" :rules="groupRules" label-width="80px">
                <el-form-item label="分组名称" prop="name">
                    <el-input v-model="groupData.name" placeholder="请输入分组名称" />
                </el-form-item>
                <el-form-item label="排序">
                    <el-input-number v-model="groupData.sortOrder" :min="0" />
                </el-form-item>
                <el-form-item label="状态">
                    <el-switch v-model="groupData.isActive" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showGroupEdit = false">取消</el-button>
                <el-button type="primary" :loading="groupLoading" @click="handleSubmitGroup"
                    >确定</el-button
                >
            </template>
        </el-dialog>

        <!-- 链接编辑弹窗 -->
        <el-dialog
            v-model="showLinkEdit"
            :title="linkData.id ? '编辑链接' : '添加链接'"
            width="500px"
        >
            <el-form ref="linkFormRef" :model="linkData" :rules="linkRules" label-width="80px">
                <el-form-item label="所属分组" prop="groupId">
                    <el-select
                        v-model="linkData.groupId"
                        placeholder="请选择分组"
                        style="width: 100%"
                    >
                        <el-option
                            v-for="g in groupOptions"
                            :key="g.id"
                            :label="g.name"
                            :value="g.id"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item label="链接名称" prop="name">
                    <el-input v-model="linkData.name" placeholder="请输入链接名称" />
                </el-form-item>
                <el-form-item label="链接类型">
                    <el-radio-group v-model="linkData.linkMode">
                        <el-radio label="custom">自定义链接</el-radio>
                        <el-radio label="builtin">内置功能</el-radio>
                    </el-radio-group>
                </el-form-item>
                <el-form-item
                    v-if="linkData.linkMode === 'builtin'"
                    label="内置功能"
                    prop="builtinKey"
                >
                    <el-select
                        v-model="linkData.builtinKey"
                        placeholder="请选择内置功能"
                        style="width: 100%"
                    >
                        <el-option
                            v-for="item in builtinFooterEntryOptions"
                            :key="item.key"
                            :label="item.label"
                            :value="item.key"
                        />
                    </el-select>
                    <div class="text-xs text-gray-400 mt-1">
                        路径由系统自动维护，当前预览：{{ builtinFooterLinkPreview || '-' }}
                    </div>
                </el-form-item>
                <el-form-item v-else label="链接地址" prop="url">
                    <el-input v-model="linkData.url" placeholder="请输入链接地址" />
                </el-form-item>
                <el-form-item label="图标">
                    <el-input v-model="linkData.icon" placeholder="图标类名" />
                </el-form-item>
                <el-form-item label="排序">
                    <el-input-number v-model="linkData.sortOrder" :min="0" />
                </el-form-item>
                <el-form-item label="新窗口">
                    <el-switch v-model="linkData.openInNewTab" />
                </el-form-item>
                <el-form-item label="状态">
                    <el-switch v-model="linkData.isActive" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showLinkEdit = false">取消</el-button>
                <el-button type="primary" :loading="linkLoading" @click="handleSubmitLink"
                    >确定</el-button
                >
            </template>
        </el-dialog>
    </div>
</template>

<script lang="ts" setup name="uiedFooter">
import {
    uiedFooterGroupList,
    uiedFooterGroupAdd,
    uiedFooterGroupEdit,
    uiedFooterGroupDelete,
    uiedFooterLinkList,
    uiedFooterLinkAdd,
    uiedFooterLinkEdit,
    uiedFooterLinkDelete,
    uiedFooterAboutConfigGet,
    uiedFooterAboutConfigSave
} from '@/api/uied'
import { usePaging } from '@/hooks/usePaging'
import feedback from '@/utils/feedback'
import type { FormInstance, FormRules } from 'element-plus'
import { computed, reactive, ref, watch } from 'vue'

const activeTab = ref('groups')
const groupOptions = ref<any[]>([])
const linkGroupFilter = ref<number | undefined>()
const linkQueryParams = reactive({
    groupId: '' as number | ''
})

// 分组
const { pager: groupPager, getLists: getGroupLists } = usePaging({ fetchFun: uiedFooterGroupList })
const showGroupEdit = ref(false)
const groupLoading = ref(false)
const groupFormRef = ref<FormInstance>()
const groupData = reactive({ id: 0, name: '', sortOrder: 0, isActive: true })
const groupRules: FormRules = {
    name: [{ required: true, message: '请输入分组名称', trigger: 'blur' }]
}

// 链接
const { pager: linkPager, getLists: getLinkListsBase } = usePaging({
    fetchFun: uiedFooterLinkList,
    params: linkQueryParams
})
/**
 * 获取链接列表（按分组筛选）
 */
const getLinkLists = () => {
    linkQueryParams.groupId = linkGroupFilter.value ?? ''
    return getLinkListsBase()
}
const showLinkEdit = ref(false)
const linkLoading = ref(false)
const linkFormRef = ref<FormInstance>()
const linkData = reactive({
    id: 0,
    groupId: undefined as number | undefined,
    name: '',
    linkMode: 'custom' as 'custom' | 'builtin',
    builtinKey: '',
    url: '',
    icon: '',
    sortOrder: 0,
    openInNewTab: false,
    isActive: true
})
const linkRules: FormRules = {
    groupId: [{ required: true, message: '请选择分组', trigger: 'change' }],
    name: [{ required: true, message: '请输入链接名称', trigger: 'blur' }],
    url: [
        {
            validator: (_rule, value, callback) => {
                if (linkData.linkMode === 'custom' && !String(value || '').trim()) {
                    callback(new Error('请输入链接地址'))
                    return
                }
                callback()
            },
            trigger: 'blur'
        }
    ],
    builtinKey: [
        {
            validator: (_rule, value, callback) => {
                if (linkData.linkMode === 'builtin' && !String(value || '').trim()) {
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
 * 获取页脚关于区域默认配置（与前台默认值保持一致）
 */
const getDefaultFooterAboutConfig = () => ({
    aboutTitle: 'UIED设计导航',
    aboutDescription:
        'UIED设计导航汇集优质设计工具与资源，涵盖UI/UX设计、平面设计、AI设计工具、三维设计等多个领域。提供Figma、Sketch、Adobe等专业设计软件资源，包含设计灵感、素材库、配色工具、字体资源、图标库等。为设计师提供一站式设计工具导航服务，助力提升设计效率与创作灵感。',
    mobileDescription: 'UIED设计导航汇集优质设计工具与资源，为设计师提供一站式工具导航服务',
    showSubmitButton: true,
    submitButtonText: '提交网站',
    submitButtonUrl: '/submit',
    submitButtonNewWindow: true,
    showChangelogButton: true,
    changelogButtonText: '更新记录',
    changelogButtonUrl: '/changelog',
    changelogButtonNewWindow: true
})

const footerAboutLoading = ref(false)
const footerAboutData = reactive(getDefaultFooterAboutConfig())

/**
 * 内置页脚入口选项
 */
const builtinFooterEntryOptions = [
    { key: 'daily_hot', label: '每日热榜', defaultPath: '/p/hot?tab=daily-hot' },
    { key: 'daily_new', label: '每日上新', defaultPath: '/p/hot?tab=daily-new' },
    { key: 'hot_articles', label: '热门文章', defaultPath: '/p/hot' },
    { key: 'rankings', label: '热门榜单', defaultPath: '/p/hot?tab=rankings' }
]

/**
 * 获取内置页脚入口默认路径
 */
const getBuiltinFooterDefaultPath = (builtinKey?: string): string => {
    const option = builtinFooterEntryOptions.find(
        (item) => item.key === String(builtinKey || '').trim()
    )
    return option?.defaultPath || ''
}

/**
 * 内置页脚入口路径预览
 */
const builtinFooterLinkPreview = computed(() => {
    if (linkData.linkMode !== 'builtin') return ''
    return getBuiltinFooterDefaultPath(linkData.builtinKey)
})

const loadGroupOptions = async () => {
    const res = await uiedFooterGroupList({ pageSize: 100 })
    groupOptions.value = res?.lists || []
}

/**
 * 读取页脚关于区域配置
 */
const loadFooterAboutConfig = async () => {
    const config = await uiedFooterAboutConfigGet()
    Object.assign(footerAboutData, getDefaultFooterAboutConfig(), config || {})
}

/**
 * 重置页脚关于区域为默认值
 */
const handleResetFooterAbout = () => {
    Object.assign(footerAboutData, getDefaultFooterAboutConfig())
}

/**
 * 保存页脚关于区域配置
 */
const handleSaveFooterAbout = async () => {
    footerAboutLoading.value = true
    try {
        const payload = {
            aboutTitle: String(footerAboutData.aboutTitle || '').trim(),
            aboutDescription: String(footerAboutData.aboutDescription || '').trim(),
            mobileDescription: String(footerAboutData.mobileDescription || '').trim(),
            showSubmitButton: Boolean(footerAboutData.showSubmitButton),
            submitButtonText: String(footerAboutData.submitButtonText || '').trim(),
            submitButtonUrl: String(footerAboutData.submitButtonUrl || '').trim(),
            submitButtonNewWindow: Boolean(footerAboutData.submitButtonNewWindow),
            showChangelogButton: Boolean(footerAboutData.showChangelogButton),
            changelogButtonText: String(footerAboutData.changelogButtonText || '').trim(),
            changelogButtonUrl: String(footerAboutData.changelogButtonUrl || '').trim(),
            changelogButtonNewWindow: Boolean(footerAboutData.changelogButtonNewWindow)
        }
        await uiedFooterAboutConfigSave(payload)
        feedback.msgSuccess('页脚关于区域保存成功')
    } finally {
        footerAboutLoading.value = false
    }
}

// 分组操作
const handleAddGroup = () => {
    Object.assign(groupData, { id: 0, name: '', sortOrder: 0, isActive: true })
    showGroupEdit.value = true
}
const handleEditGroup = (row: any) => {
    Object.assign(groupData, row)
    showGroupEdit.value = true
}
const handleSubmitGroup = async () => {
    await groupFormRef.value?.validate()
    groupLoading.value = true
    try {
        if (groupData.id) {
            await uiedFooterGroupEdit(groupData)
            feedback.msgSuccess('编辑成功')
        } else {
            await uiedFooterGroupAdd(groupData)
            feedback.msgSuccess('添加成功')
        }
        showGroupEdit.value = false
        getGroupLists()
        loadGroupOptions()
    } finally {
        groupLoading.value = false
    }
}
const handleDeleteGroup = async (id: number) => {
    await feedback.confirm('确定要删除该分组吗？分组下的链接也会被删除')
    await uiedFooterGroupDelete({ id })
    feedback.msgSuccess('删除成功')
    getGroupLists()
    loadGroupOptions()
}

// 链接操作
const handleAddLink = () => {
    Object.assign(linkData, {
        id: 0,
        groupId: undefined,
        name: '',
        linkMode: 'custom',
        builtinKey: '',
        url: '',
        icon: '',
        sortOrder: 0,
        openInNewTab: false,
        isActive: true
    })
    showLinkEdit.value = true
}
const handleEditLink = (row: any) => {
    Object.assign(linkData, row, {
        linkMode: row?.builtinKey ? 'builtin' : 'custom',
        builtinKey: String(row?.builtinKey || '')
    })
    showLinkEdit.value = true
}

/**
 * 链接类型/内置功能变化时回填默认路径（便于预览与保存兜底）
 */
watch(
    () => [linkData.linkMode, linkData.builtinKey],
    ([linkMode]) => {
        if (linkMode !== 'builtin') return
        const defaultPath = getBuiltinFooterDefaultPath(linkData.builtinKey)
        if (defaultPath) {
            linkData.url = defaultPath
        }
    }
)
const handleSubmitLink = async () => {
    await linkFormRef.value?.validate()
    linkLoading.value = true
    try {
        const submitData = {
            ...linkData,
            builtinKey:
                linkData.linkMode === 'builtin' ? String(linkData.builtinKey || '').trim() : '',
            url:
                linkData.linkMode === 'builtin'
                    ? getBuiltinFooterDefaultPath(linkData.builtinKey) || String(linkData.url || '')
                    : String(linkData.url || '').trim()
        }
        if (linkData.id) {
            await uiedFooterLinkEdit(submitData)
            feedback.msgSuccess('编辑成功')
        } else {
            await uiedFooterLinkAdd(submitData)
            feedback.msgSuccess('添加成功')
        }
        showLinkEdit.value = false
        getLinkLists()
    } finally {
        linkLoading.value = false
    }
}
const handleDeleteLink = async (id: number) => {
    await feedback.confirm('确定要删除该链接吗？')
    await uiedFooterLinkDelete({ id })
    feedback.msgSuccess('删除成功')
    getLinkLists()
}

getGroupLists()
getLinkLists()
loadGroupOptions()
loadFooterAboutConfig()
</script>
