<!--
 * @file views/uied/banner/index.vue
 * @description UIED 广告管理
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
-->
<template>
    <div class="banner-lists">
        <el-card class="!border-none" shadow="never">
            <el-alert
                title="前端显示位置说明：广告管理用于图片/HTML广告位（支持多位置）；详情页与侧栏展示时会优先读【商业位体系】，若商业位无投放会自动回退到广告管理配置。"
                type="info"
                :closable="false"
                class="mb-4"
            />
            <el-card shadow="never" class="mb-4 banner-ops-helper">
                <template #header>
                    <div class="flex items-center justify-between">
                        <span class="font-medium">前端位置说明与快捷预览</span>
                        <div class="text-xs text-gray-400">配置位置 + 页面标识后可直接预览验证</div>
                    </div>
                </template>
                <div class="banner-ops-helper__grid">
                    <div class="banner-ops-helper__card">
                        <div class="banner-ops-helper__title">常用位置说明</div>
                        <div class="banner-ops-helper__row">
                            <code>global_strip / top / home</code><span>首页顶部横条广告</span>
                        </div>
                        <div class="banner-ops-helper__row">
                            <code>sidebar / website_detail_sidebar</code
                            ><span>侧栏广告（首页/详情页按 pageSlug 区分）</span>
                        </div>
                        <div class="banner-ops-helper__row">
                            <code>footer / bottom</code><span>底部广告</span>
                        </div>
                        <div class="banner-ops-helper__row">
                            <code>detail / popup</code><span>详情页旧兼容位置</span>
                        </div>
                    </div>
                    <div class="banner-ops-helper__card">
                        <div class="banner-ops-helper__title">快捷预览入口</div>
                        <div class="flex flex-wrap gap-2">
                            <el-button size="small" @click="openPreviewPage('/')"
                                >前端首页</el-button
                            >
                            <el-button size="small" @click="openPreviewPage('/p/daily-hot')"
                                >每日热榜</el-button
                            >
                            <el-button size="small" @click="openPreviewPage('/p/rankings')"
                                >榜单系统</el-button
                            >
                            <el-button size="small" @click="openPreviewPage('/website/1')"
                                >网址详情（示例）</el-button
                            >
                        </div>
                        <div class="banner-ops-helper__tip">
                            提示：请同时检查
                            <code>位置(position)</code>、<code>页面标识(pageSlug)</code>、<code
                                >状态</code
                            >
                            和 <code>时间窗</code>。
                        </div>
                    </div>
                </div>
            </el-card>
            <div class="mb-4 flex justify-between">
                <el-button type="primary" @click="handleAdd">
                    <template #icon><icon name="el-icon-Plus" /></template>
                    添加广告
                </el-button>
                <div class="text-gray-400">共 {{ pager.count }} 条广告</div>
            </div>
            <el-table size="large" v-loading="pager.loading" :data="pager.lists">
                <el-table-column label="ID" prop="id" width="80" />
                <el-table-column label="类型" width="90">
                    <template #default="{ row }">
                        <el-tag
                            size="small"
                            :type="row.contentType === 'html' ? 'warning' : 'success'"
                        >
                            {{ row.contentType === 'html' ? 'HTML' : '图片' }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="图片" width="120">
                    <template #default="{ row }">
                        <el-image
                            v-if="row.contentType !== 'html' && row.image"
                            :src="row.image"
                            :preview-src-list="[row.image]"
                            fit="cover"
                            style="width: 80px; height: 45px"
                        />
                        <span v-else-if="row.contentType === 'html'" class="text-xs text-gray-500"
                            >HTML代码</span
                        >
                        <span v-else>-</span>
                    </template>
                </el-table-column>
                <el-table-column label="标题" prop="title" min-width="150" />
                <el-table-column label="链接" prop="url" min-width="200" show-overflow-tooltip />
                <el-table-column label="位置/slot" min-width="180">
                    <template #default="{ row }">
                        <div class="banner-position-tags">
                            <el-tag
                                v-for="position in resolvePositionLabels(row)"
                                :key="`${row.id}-${position}`"
                                size="small"
                                effect="plain"
                            >
                                {{ position }}
                            </el-tag>
                        </div>
                    </template>
                </el-table-column>
                <el-table-column
                    label="页面标识"
                    prop="pageSlug"
                    min-width="120"
                    show-overflow-tooltip
                />
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
        <el-dialog v-model="showEdit" :title="editData.id ? '编辑广告' : '添加广告'" width="500px">
            <el-form ref="editFormRef" :model="editData" :rules="editRules" label-width="80px">
                <el-form-item label="标题" prop="title">
                    <el-input v-model="editData.title" placeholder="请输入标题" />
                </el-form-item>
                <el-form-item label="描述">
                    <el-input v-model="editData.description" placeholder="广告描述（可选）" />
                </el-form-item>
                <el-form-item label="内容类型" prop="contentType">
                    <el-radio-group v-model="editData.contentType">
                        <el-radio-button label="image">图片广告</el-radio-button>
                        <el-radio-button label="html">HTML代码</el-radio-button>
                    </el-radio-group>
                </el-form-item>
                <el-form-item v-if="editData.contentType !== 'html'" label="图片" prop="image">
                    <el-input
                        v-model="editData.image"
                        placeholder="图片URL（可接上传组件返回地址）"
                    />
                </el-form-item>
                <el-form-item v-else label="HTML代码" prop="htmlContent">
                    <el-input
                        v-model="editData.htmlContent"
                        type="textarea"
                        :rows="6"
                        placeholder="可填写广告脚本/iframe/HTML片段（请确认来源安全）"
                    />
                </el-form-item>
                <el-form-item label="跳转链接">
                    <el-input
                        v-model="editData.linkUrl"
                        placeholder="点击跳转链接（HTML广告可留空）"
                    />
                </el-form-item>
                <el-form-item label="打开方式">
                    <el-select v-model="editData.linkTarget" style="width: 100%">
                        <el-option label="新窗口(_blank)" value="_blank" />
                        <el-option label="当前窗口(_self)" value="_self" />
                    </el-select>
                </el-form-item>
                <el-form-item label="位置" prop="positionList">
                    <el-select
                        v-model="editData.positionList"
                        multiple
                        collapse-tags
                        collapse-tags-tooltip
                        style="width: 100%"
                        placeholder="至少选择一个广告位置"
                    >
                        <el-option
                            v-for="item in bannerPositionOptions"
                            :key="item.value"
                            :label="item.label"
                            :value="item.value"
                        />
                    </el-select>
                    <div class="text-xs text-gray-400 mt-1">支持多选，保存后会在所有选中位置生效。</div>
                </el-form-item>
                <el-form-item label="页面标识">
                    <el-input
                        v-model="editData.pageSlug"
                        placeholder="例如：all / daily-hot / rankings / website-detail（可选）"
                    />
                </el-form-item>
                <el-form-item label="排序">
                    <el-input-number v-model="editData.sortOrder" :min="0" />
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

<script lang="ts" setup name="uiedBanner">
import { uiedBannerList, uiedBannerAdd, uiedBannerEdit, uiedBannerDelete } from '@/api/uied'
import { usePaging } from '@/hooks/usePaging'
import feedback from '@/utils/feedback'
import type { FormInstance, FormRules } from 'element-plus'

const { pager, getLists } = usePaging({ fetchFun: uiedBannerList })

const showEdit = ref(false)
const editLoading = ref(false)
const editFormRef = ref<FormInstance>()
const bannerPositionOptions = [
    { label: '首页（home）', value: 'home' },
    { label: '侧边栏（sidebar）', value: 'sidebar' },
    { label: '底部（footer）', value: 'footer' },
    { label: '详情页（detail）', value: 'detail' },
    { label: '全局横条（global_strip）', value: 'global_strip' },
    { label: '详情顶部（detail_top）', value: 'detail_top' },
    { label: '详情正文中（detail_inline）', value: 'detail_inline' },
    { label: '详情底部（detail_bottom）', value: 'detail_bottom' },
    { label: '详情侧栏（detail_sidebar）', value: 'detail_sidebar' }
]
const bannerPositionLabelMap = bannerPositionOptions.reduce<Record<string, string>>((acc, item) => {
    acc[item.value] = item.label
    return acc
}, {})
bannerPositionLabelMap.website_detail_sidebar = bannerPositionLabelMap.detail_sidebar

/**
 * 规范化广告位置列表，兼容数组与逗号分隔字符串。
 */
const normalizePositionList = (value: unknown): string[] => {
    const source = Array.isArray(value)
        ? value
        : String(value || '')
              .split(',')
              .map((item) => item.trim())
              .filter(Boolean)
    return Array.from(new Set(source.map((item) => String(item).trim()).filter(Boolean)))
}

/**
 * 渲染列表“位置/slot”列标签。
 */
const resolvePositionLabels = (row: any): string[] => {
    const values = normalizePositionList(row?.positionList?.length ? row.positionList : row?.position)
    if (values.length === 0) return [ '未设置' ]
    return values.map((value) => bannerPositionLabelMap[value] || value)
}

const editData = reactive({
    id: 0,
    title: '',
    description: '',
    image: '',
    url: '',
    linkUrl: '',
    linkTarget: '_blank',
    contentType: 'image',
    htmlContent: '',
    pageSlug: 'all',
    position: 'home',
    positionList: [ 'home' ] as string[],
    sortOrder: 0,
    isActive: true
})
const editRules: FormRules = {
    title: [{ required: true, message: '请输入标题', trigger: 'blur' }],
    image: [
        {
            validator: (_rule, value, callback) => {
                if (editData.contentType === 'html') {
                    callback()
                    return
                }
                if (!String(value || '').trim()) {
                    callback(new Error('请输入图片URL'))
                    return
                }
                callback()
            },
            trigger: 'blur'
        }
    ],
    htmlContent: [
        {
            validator: (_rule, value, callback) => {
                if (editData.contentType !== 'html') {
                    callback()
                    return
                }
                if (!String(value || '').trim()) {
                    callback(new Error('请输入HTML代码'))
                    return
                }
                callback()
            },
            trigger: 'blur'
        }
    ],
    positionList: [
        {
            validator: (_rule, value, callback) => {
                if (normalizePositionList(value).length === 0) {
                    callback(new Error('请至少选择一个广告位置'))
                    return
                }
                callback()
            },
            trigger: 'change'
        }
    ]
}

const resetEditData = () =>
    Object.assign(editData, {
        id: 0,
        title: '',
        description: '',
        image: '',
        url: '',
        linkUrl: '',
        linkTarget: '_blank',
        contentType: 'image',
        htmlContent: '',
        pageSlug: 'all',
        position: 'home',
        positionList: [ 'home' ],
        sortOrder: 0,
        isActive: true
    })

const handleAdd = () => {
    resetEditData()
    showEdit.value = true
}
const handleEdit = (row: any) => {
    Object.assign(editData, {
        ...row,
        linkUrl: row.linkUrl || row.url || '',
        url: row.url || row.linkUrl || '',
        linkTarget: row.linkTarget || '_blank',
        contentType: row.contentType || 'image',
        htmlContent: row.htmlContent || '',
        pageSlug: row.pageSlug || 'all',
        positionList: normalizePositionList(row.positionList?.length ? row.positionList : row.position)
    })
    if (editData.positionList.length === 0) {
        editData.positionList = [ 'home' ]
    }
    showEdit.value = true
}

const handleSubmit = async () => {
    if (editData.contentType === 'html') {
        editData.image = ''
    } else {
        editData.htmlContent = ''
    }
    await editFormRef.value?.validate()
    editLoading.value = true
    try {
        const positionList = normalizePositionList(editData.positionList)
        const submitData = {
            ...editData,
            positionList,
            position: positionList[0] || 'home'
        }
        if (editData.id) {
            await uiedBannerEdit(submitData)
            feedback.msgSuccess('编辑成功')
        } else {
            await uiedBannerAdd(submitData)
            feedback.msgSuccess('添加成功')
        }
        showEdit.value = false
        await getLists()
    } catch (error: any) {
        const validationError = error?.fields ? '请先完善表单必填项' : ''
        feedback.msgError(
            validationError ||
                error?.msg ||
                error?.message ||
                error?.response?.data?.message ||
                '保存广告失败'
        )
    } finally {
        editLoading.value = false
    }
}

const handleDelete = async (id: number) => {
    await feedback.confirm('确定要删除该广告吗？')
    await uiedBannerDelete({ id })
    feedback.msgSuccess('删除成功')
    await getLists()
}

/**
 * 打开前端预览页面，帮助运营快速验证广告位是否显示
 */
const openPreviewPage = (path: string) => {
    const normalized = String(path || '').startsWith('/') ? path : `/${path}`
    window.open(`http://localhost:3003${normalized}`, '_blank')
}

getLists()
</script>

<style scoped>
.banner-ops-helper :deep(.el-card__body) {
    padding-top: 12px;
}

.banner-ops-helper__grid {
    display: grid;
    grid-template-columns: 1.1fr 0.9fr;
    gap: 12px;
}

.banner-ops-helper__card {
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 10px;
    padding: 10px 12px;
    background: var(--el-fill-color-extra-light);
}

.banner-ops-helper__title {
    font-weight: 600;
    margin-bottom: 8px;
}

.banner-ops-helper__row {
    display: grid;
    grid-template-columns: 220px 1fr;
    gap: 8px;
    align-items: start;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    padding: 4px 0;
}

.banner-ops-helper__row code {
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    padding: 0 8px;
    border-radius: 999px;
    border: 1px solid var(--el-border-color-lighter);
    background: #fff;
    color: var(--el-color-primary);
}

.banner-ops-helper__tip {
    margin-top: 8px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    line-height: 1.6;
}

.banner-position-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
}

@media (max-width: 900px) {
    .banner-ops-helper__grid {
        grid-template-columns: 1fr;
    }

    .banner-ops-helper__row {
        grid-template-columns: 1fr;
    }
}
</style>
