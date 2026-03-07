<!--
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-08
 */
-->
<template>
    <div class="social-media-setting">
        <el-card class="!border-none social-media-card" shadow="never">
            <template #header>
                <div class="social-media-card__header">
                    <div>
                        <div class="social-media-card__title">前端配置 · 社交媒体</div>
                        <div class="social-media-card__subtitle">
                            数据已对接前台页脚「关注交流」，保存后前台实时读取最新配置。
                        </div>
                    </div>
                </div>
            </template>

            <el-tabs v-model="activeTab" class="social-media-tabs">
                <el-tab-pane label="分组管理" name="groups">
                    <div class="panel-toolbar">
                        <el-button type="primary" @click="handleAddGroup">
                            <template #icon><icon name="el-icon-Plus" /></template>
                            添加分组
                        </el-button>
                    </div>
                    <el-table size="large" v-loading="groupPager.loading" :data="groupPager.lists">
                        <el-table-column label="ID" prop="id" width="80" />
                        <el-table-column label="图标" min-width="120">
                            <template #default="{ row }">
                                <div class="icon-cell">
                                    <el-image
                                        v-if="isAssetUrl(row.icon)"
                                        :src="row.icon"
                                        fit="cover"
                                        class="icon-cell__preview"
                                        :preview-src-list="[row.icon]"
                                    />
                                    <span
                                        v-else-if="resolveSvgIconMarkup(row.icon)"
                                        class="icon-cell__svg"
                                        v-html="resolveSvgIconMarkup(row.icon)"
                                    />
                                    <el-tag v-else type="info" effect="plain" size="small">
                                        {{ row.icon || '默认图标' }}
                                    </el-tag>
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column label="分组昵称" prop="name" min-width="180" />
                        <el-table-column label="展示样式" min-width="130">
                            <template #default="{ row }">
                                <el-tag size="small" effect="plain">
                                    {{ getDisplayTypeLabel(row.displayType) }}
                                </el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="排序" prop="sortOrder" width="90" />
                        <el-table-column label="状态" width="90">
                            <template #default="{ row }">
                                <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
                                    {{ row.isActive ? '显示' : '隐藏' }}
                                </el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="操作" width="140" fixed="right">
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

                <el-tab-pane label="社交媒体" name="items">
                    <div class="social-preview">
                        <div class="social-preview__header">
                            <div class="social-preview__title">官网预览（每行 3 个）</div>
                            <div class="social-preview__desc">
                                与前台页脚“关注交流”一致：图标 + 昵称，便于运营校验视觉统一性。
                            </div>
                        </div>
                        <div v-if="socialPreviewGroups.length > 0" class="social-preview__grid">
                            <div
                                v-for="group in socialPreviewGroups"
                                :key="group.id"
                                class="social-preview__item"
                            >
                                <span class="social-preview__icon">
                                    <img
                                        v-if="isAssetUrl(group.icon)"
                                        :src="group.icon"
                                        :alt="group.name"
                                        class="social-preview__icon-image"
                                    />
                                    <span
                                        v-else-if="resolveSvgIconMarkup(group.icon)"
                                        class="social-preview__icon-svg"
                                        v-html="resolveSvgIconMarkup(group.icon)"
                                    />
                                    <span v-else class="social-preview__icon-text">
                                        {{ getIconText(group.icon, group.name) }}
                                    </span>
                                </span>
                                <span class="social-preview__name">{{ group.name }}</span>
                            </div>
                        </div>
                        <el-empty v-else :image-size="64" description="请先添加并启用社交媒体分组" />
                    </div>

                    <div class="panel-toolbar panel-toolbar--split">
                        <div class="panel-toolbar__left">
                            <el-button type="primary" @click="handleAddItem">
                                <template #icon><icon name="el-icon-Plus" /></template>
                                添加社交媒体
                            </el-button>
                        </div>
                        <div class="panel-toolbar__right">
                            <el-select
                                v-model="itemGroupFilter"
                                placeholder="按分组筛选"
                                clearable
                                style="width: 220px"
                                @change="getItemLists"
                            >
                                <el-option
                                    v-for="group in groupOptions"
                                    :key="group.id"
                                    :label="group.name"
                                    :value="group.id"
                                />
                            </el-select>
                        </div>
                    </div>

                    <el-table size="large" v-loading="itemPager.loading" :data="itemPager.lists">
                        <el-table-column label="ID" prop="id" width="80" />
                        <el-table-column label="所属分组" prop="groupName" min-width="130" />
                        <el-table-column label="平台类型" min-width="130">
                            <template #default="{ row }">
                                <el-tag size="small" effect="plain">
                                    {{ getPlatformLabel(row.type) }}
                                </el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="昵称" prop="name" min-width="150" />
                        <el-table-column label="链接" prop="url" min-width="220" show-overflow-tooltip />
                        <el-table-column label="图标" min-width="110">
                            <template #default="{ row }">
                                <div class="icon-cell">
                                    <el-image
                                        v-if="isAssetUrl(row.icon)"
                                        :src="row.icon"
                                        fit="cover"
                                        class="icon-cell__preview"
                                        :preview-src-list="[row.icon]"
                                    />
                                    <span
                                        v-else-if="resolveSvgIconMarkup(row.icon)"
                                        class="icon-cell__svg"
                                        v-html="resolveSvgIconMarkup(row.icon)"
                                    />
                                    <span v-else class="icon-cell__text">{{ row.icon || '-' }}</span>
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column label="二维码" min-width="110">
                            <template #default="{ row }">
                                <el-image
                                    v-if="isAssetUrl(row.qrCode)"
                                    :src="row.qrCode"
                                    fit="cover"
                                    class="icon-cell__preview"
                                    :preview-src-list="[row.qrCode]"
                                />
                                <span v-else class="icon-cell__text">-</span>
                            </template>
                        </el-table-column>
                        <el-table-column label="排序" prop="sortOrder" width="90" />
                        <el-table-column label="状态" width="90">
                            <template #default="{ row }">
                                <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
                                    {{ row.isActive ? '显示' : '隐藏' }}
                                </el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="操作" width="140" fixed="right">
                            <template #default="{ row }">
                                <el-button type="primary" link @click="handleEditItem(row)"
                                    >编辑</el-button
                                >
                                <el-button type="danger" link @click="handleDeleteItem(row.id)"
                                    >删除</el-button
                                >
                            </template>
                        </el-table-column>
                    </el-table>
                    <div class="flex justify-end mt-4">
                        <pagination v-model="itemPager" @change="getItemLists" />
                    </div>
                </el-tab-pane>
            </el-tabs>
        </el-card>

        <el-dialog
            v-model="showGroupEdit"
            :title="groupData.id ? '编辑分组' : '添加分组'"
            width="560px"
        >
            <el-form ref="groupFormRef" :model="groupData" :rules="groupRules" label-width="90px">
                <el-form-item label="分组昵称" prop="name">
                    <el-input v-model="groupData.name" placeholder="例如：官方社群" />
                </el-form-item>
                <el-form-item label="分组图标">
                    <div class="icon-editor">
                        <div class="icon-editor__row">
                            <el-input
                                v-model="groupData.icon"
                                placeholder="支持 svg:key / 图片 URL / 文本图标"
                                clearable
                            />
                            <material-picker v-model="groupData.icon" :limit="1">
                                <el-button>素材中心</el-button>
                            </material-picker>
                        </div>
                        <svg-library-picker
                            v-model="groupData.icon"
                            :options="categorySvgLibraryOptions"
                            class="icon-editor__svg-picker"
                        />
                        <div class="icon-editor__tip">可直接选择 SVG 图标库（写入格式：svg:key）</div>
                        <div v-if="isAssetUrl(groupData.icon)" class="icon-editor__preview">
                            <el-image :src="groupData.icon" fit="cover" class="icon-cell__preview" />
                        </div>
                        <div v-else-if="resolveSvgIconMarkup(groupData.icon)" class="icon-editor__preview">
                            <span
                                class="icon-cell__svg icon-cell__svg--preview"
                                v-html="resolveSvgIconMarkup(groupData.icon)"
                            />
                        </div>
                    </div>
                </el-form-item>
                <el-form-item label="展示样式" prop="displayType">
                    <el-select v-model="groupData.displayType" style="width: 100%">
                        <el-option
                            v-for="option in DISPLAY_TYPE_OPTIONS"
                            :key="option.value"
                            :label="option.label"
                            :value="option.value"
                        />
                    </el-select>
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
                    >保存分组</el-button
                >
            </template>
        </el-dialog>

        <el-dialog
            v-model="showItemEdit"
            :title="itemData.id ? '编辑社交媒体' : '添加社交媒体'"
            width="660px"
        >
            <el-form ref="itemFormRef" :model="itemData" :rules="itemRules" label-width="90px">
                <el-form-item label="所属分组" prop="groupId">
                    <div class="group-select-row">
                        <el-select
                            v-model="itemData.groupId"
                            placeholder="请选择分组"
                            style="width: 100%"
                        >
                            <el-option
                                v-for="group in groupOptions"
                                :key="group.id"
                                :label="group.name"
                                :value="group.id"
                            />
                        </el-select>
                        <el-button @click="handleCreateGroupFromItem">自定义分组</el-button>
                    </div>
                </el-form-item>
                <el-form-item label="平台类型" prop="type">
                    <el-select
                        v-model="itemData.type"
                        placeholder="选择或输入平台类型"
                        style="width: 100%"
                        allow-create
                        filterable
                        default-first-option
                    >
                        <el-option
                            v-for="option in PLATFORM_OPTIONS"
                            :key="option.value"
                            :label="option.label"
                            :value="option.value"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item label="昵称" prop="name">
                    <el-input v-model="itemData.name" placeholder="请输入展示昵称" />
                </el-form-item>
                <el-form-item label="链接地址">
                    <el-input v-model="itemData.url" placeholder="https://example.com" clearable />
                </el-form-item>
                <el-form-item label="图标">
                    <div class="icon-editor">
                        <div class="icon-editor__row">
                            <el-input
                                v-model="itemData.icon"
                                placeholder="支持 svg:key / 图片 URL / 文本图标"
                                clearable
                            />
                            <material-picker v-model="itemData.icon" :limit="1">
                                <el-button>素材中心</el-button>
                            </material-picker>
                        </div>
                        <svg-library-picker
                            v-model="itemData.icon"
                            :options="categorySvgLibraryOptions"
                            class="icon-editor__svg-picker"
                        />
                        <div class="icon-editor__tip">可直接选择 SVG 图标库（写入格式：svg:key）</div>
                        <div v-if="isAssetUrl(itemData.icon)" class="icon-editor__preview">
                            <el-image :src="itemData.icon" fit="cover" class="icon-cell__preview" />
                        </div>
                        <div v-else-if="resolveSvgIconMarkup(itemData.icon)" class="icon-editor__preview">
                            <span
                                class="icon-cell__svg icon-cell__svg--preview"
                                v-html="resolveSvgIconMarkup(itemData.icon)"
                            />
                        </div>
                    </div>
                </el-form-item>
                <el-form-item label="二维码">
                    <div class="icon-editor">
                        <div class="icon-editor__row">
                            <el-input
                                v-model="itemData.qrCode"
                                placeholder="支持URL或素材中心选择"
                                clearable
                            />
                            <material-picker v-model="itemData.qrCode" :limit="1">
                                <el-button>素材中心</el-button>
                            </material-picker>
                        </div>
                        <div v-if="isAssetUrl(itemData.qrCode)" class="icon-editor__preview">
                            <el-image
                                :src="itemData.qrCode"
                                fit="cover"
                                class="icon-cell__preview"
                            />
                        </div>
                    </div>
                </el-form-item>
                <el-form-item label="描述">
                    <el-input
                        v-model="itemData.description"
                        type="textarea"
                        :rows="2"
                        placeholder="用于前台悬浮层说明，可选"
                    />
                </el-form-item>
                <el-form-item label="排序">
                    <el-input-number v-model="itemData.sortOrder" :min="0" />
                </el-form-item>
                <el-form-item label="状态">
                    <el-switch v-model="itemData.isActive" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showItemEdit = false">取消</el-button>
                <el-button type="primary" :loading="itemLoading" @click="handleSubmitItem"
                    >保存社交媒体</el-button
                >
            </template>
        </el-dialog>
    </div>
</template>

<script lang="ts" setup name="uiedSocialMedia">
import {
    uiedSocialMediaGroupList,
    uiedSocialMediaGroupAll,
    uiedSocialMediaGroupAdd,
    uiedSocialMediaGroupEdit,
    uiedSocialMediaGroupDelete,
    uiedSocialMediaItemList,
    uiedSocialMediaItemAdd,
    uiedSocialMediaItemEdit,
    uiedSocialMediaItemDelete,
    uiedSettingGet
} from '@/api/uied'
import { usePaging } from '@/hooks/usePaging'
import feedback from '@/utils/feedback'
import MaterialPicker from '@/components/material/picker.vue'
import SvgLibraryPicker from '@/components/svg-library/picker.vue'
import type { FormInstance, FormRules } from 'element-plus'
import { computed, reactive, ref } from 'vue'

interface SvgLibraryOption {
    key: string
    label: string
    svg: string
}

const DISPLAY_TYPE_OPTIONS = [
    { label: '链接列表（links）', value: 'links' },
    { label: '二维码矩阵（qrcode）', value: 'qrcode' },
    { label: '混合布局（mixed）', value: 'mixed' }
]

const PLATFORM_OPTIONS = [
    { label: '微信（wechat）', value: 'wechat' },
    { label: '微博（weibo）', value: 'weibo' },
    { label: '抖音（douyin）', value: 'douyin' },
    { label: '小红书（xiaohongshu）', value: 'xiaohongshu' },
    { label: 'B站（bilibili）', value: 'bilibili' },
    { label: 'GitHub（github）', value: 'github' },
    { label: 'Twitter（twitter）', value: 'twitter' },
    { label: '公众号（wechat_official）', value: 'wechat_official' },
    { label: '社群（wechat_group）', value: 'wechat_group' },
    { label: '其他（other）', value: 'other' }
]

const PLATFORM_LABEL_MAP = PLATFORM_OPTIONS.reduce<Record<string, string>>((acc, item) => {
    acc[item.value] = item.label
    return acc
}, {})

const activeTab = ref('groups')
const groupOptions = ref<any[]>([])
const categorySvgLibraryOptions = ref<SvgLibraryOption[]>([])
const itemGroupFilter = ref<number | undefined>()
const itemQueryParams = reactive({
    groupId: '' as number | ''
})

const socialPreviewGroups = computed(() =>
    (groupOptions.value || [])
        .filter((item) => item && item.isActive !== false)
        .sort((left, right) => Number(left?.sortOrder || 0) - Number(right?.sortOrder || 0))
)

const { pager: groupPager, getLists: getGroupListsBase } = usePaging({
    fetchFun: uiedSocialMediaGroupList
})
const { pager: itemPager, getLists: getItemListsBase } = usePaging({
    fetchFun: uiedSocialMediaItemList,
    params: itemQueryParams
})

const showGroupEdit = ref(false)
const groupLoading = ref(false)
const groupFormRef = ref<FormInstance>()
const reopenItemDialogAfterGroup = ref(false)
const groupData = reactive({
    id: 0,
    name: '',
    icon: '',
    displayType: 'links',
    sortOrder: 0,
    isActive: true
})
const groupRules: FormRules = {
    name: [{ required: true, message: '请输入分组昵称', trigger: 'blur' }],
    displayType: [{ required: true, message: '请选择展示样式', trigger: 'change' }]
}

const showItemEdit = ref(false)
const itemLoading = ref(false)
const itemFormRef = ref<FormInstance>()
const itemData = reactive({
    id: 0,
    groupId: undefined as number | undefined,
    type: 'other',
    name: '',
    url: '',
    icon: '',
    qrCode: '',
    description: '',
    sortOrder: 0,
    isActive: true
})
const itemRules: FormRules = {
    groupId: [{ required: true, message: '请选择所属分组', trigger: 'change' }],
    type: [{ required: true, message: '请选择平台类型', trigger: 'change' }],
    name: [{ required: true, message: '请输入昵称', trigger: 'blur' }]
}

/**
 * 判断值是否为可预览图片 URL（http/data/绝对路径）。
 * @param value 待判断值
 */
const isAssetUrl = (value: unknown): boolean => {
    const text = String(value || '').trim()
    return /^https?:\/\//i.test(text) || /^data:image\//i.test(text) || text.startsWith('/uploads/')
}

/**
 * 清洗 SVG 文本，避免后台预览阶段执行脚本。
 * @param value SVG 原始字符串
 */
const sanitizeSvgMarkup = (value: unknown): string => {
    const text = String(value || '').trim()
    if (!text) return ''
    const sanitized = text
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
        .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
        .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
        .replace(/javascript:/gi, '')
        .trim()
    return sanitized.toLowerCase().startsWith('<svg') ? sanitized : ''
}

/**
 * 规范化 SVG 图标库列表，兼容数组/对象/JSON 字符串。
 * @param value 图标库原始值
 */
const normalizeCategorySvgLibrary = (value: unknown): SvgLibraryOption[] => {
    let source = value
    if (typeof source === 'string') {
        try {
            source = JSON.parse(source)
        } catch (_error) {
            source = []
        }
    }
    const rows = Array.isArray(source)
        ? source
        : source && typeof source === 'object'
        ? Object.keys(source as Record<string, unknown>).map((key) => ({
              key,
              svg: (source as Record<string, unknown>)[key]
          }))
        : []
    return rows
        .map((item: any, index: number) => {
            const key = String(item?.key || '')
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9_-]/g, '')
                .slice(0, 40)
            if (!key) return null
            const svg = sanitizeSvgMarkup(item?.svg)
            if (!svg) return null
            const label = String(item?.label || key).trim().slice(0, 40) || key
            const sort = Number.isFinite(Number(item?.sort)) ? Number(item.sort) : index + 1
            return { key, label, svg, sort }
        })
        .filter((item): item is SvgLibraryOption & { sort: number } => Boolean(item))
        .sort((a, b) => a.sort - b.sort)
        .map(({ key, label, svg }) => ({ key, label, svg }))
}

/**
 * 判断图标值是否为 svg:key 令牌。
 * @param value 图标值
 */
const isSvgIconToken = (value: unknown): boolean => /^svg:/i.test(String(value || '').trim())

/**
 * 根据 svg:key 解析 SVG 代码，用于表格与表单预览。
 * @param value 图标值
 */
const resolveSvgIconMarkup = (value: unknown): string => {
    const raw = String(value || '').trim()
    if (!isSvgIconToken(raw)) return ''
    const key = raw
        .slice(4)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '')
        .slice(0, 40)
    if (!key) return ''
    const matched = categorySvgLibraryOptions.value.find((item) => item.key === key)
    return matched?.svg || ''
}

/**
 * 获取图标兜底文案（最多显示 2 个字符）。
 * @param icon 图标值
 * @param name 名称值
 */
const getIconText = (icon: unknown, name: unknown): string => {
    const iconText = String(icon || '').trim()
    if (iconText && !isSvgIconToken(iconText)) return iconText.slice(0, 2)
    const nameText = String(name || '').trim()
    return nameText.slice(0, 2) || '图标'
}

/**
 * 获取分组展示类型文案。
 * @param displayType 展示类型
 */
const getDisplayTypeLabel = (displayType: unknown): string => {
    const value = String(displayType || 'links')
    return DISPLAY_TYPE_OPTIONS.find((item) => item.value === value)?.label || '链接列表（links）'
}

/**
 * 获取平台类型文案。
 * @param type 平台类型值
 */
const getPlatformLabel = (type: unknown): string => {
    const value = String(type || 'other').trim()
    return PLATFORM_LABEL_MAP[value] || `${value || 'other'}（自定义）`
}

/**
 * 统一分组列表数据结构，兼容旧字段命名。
 * @param row 后端返回行
 */
const normalizeGroupRow = (row: any) => {
    const displayType = String(row?.displayType || row?.position || 'links')
    return {
        id: Number(row?.id || 0),
        name: String(row?.name || ''),
        icon: String(row?.icon || ''),
        displayType: [ 'links', 'qrcode', 'mixed' ].includes(displayType) ? displayType : 'links',
        sortOrder: Number(row?.sortOrder ?? row?.sort ?? 0),
        isActive: row?.isActive !== false && row?.isShow !== false
    }
}

/**
 * 统一项目列表数据结构，兼容旧字段命名。
 * @param row 后端返回行
 */
const normalizeItemRow = (row: any) => {
    return {
        id: Number(row?.id || 0),
        groupId: row?.groupId !== undefined ? Number(row.groupId) : undefined,
        groupName: String(row?.groupName || row?.group_name || ''),
        type: String(row?.type || row?.platform || 'other'),
        name: String(row?.name || ''),
        url: String(row?.url || row?.link || ''),
        icon: String(row?.icon || ''),
        qrCode: String(row?.qrCode || row?.qrCodeUrl || row?.qr_code_url || ''),
        description: String(row?.description || ''),
        sortOrder: Number(row?.sortOrder ?? row?.sort ?? 0),
        isActive: row?.isActive !== false && row?.isShow !== false
    }
}

/**
 * 拉取分组下拉选项（包含 icon/name，供项目编辑使用）。
 */
const loadGroupOptions = async () => {
    const rows = await uiedSocialMediaGroupAll()
    groupOptions.value = Array.isArray(rows) ? rows.map(normalizeGroupRow) : []
}

/**
 * 加载页面全局配置里的 SVG 图标库。
 */
const loadCategorySvgLibrary = async () => {
    try {
        const res = await uiedSettingGet({ key: 'pageGlobalConfig' })
        categorySvgLibraryOptions.value = normalizeCategorySvgLibrary((res as any)?.categorySvgLibrary)
    } catch (error) {
        console.error('加载社交媒体 SVG 图标库失败:', error)
        categorySvgLibraryOptions.value = []
    }
}

/**
 * 获取分组分页列表，并统一字段命名。
 */
const getGroupLists = async () => {
    const res = await getGroupListsBase()
    groupPager.lists = (groupPager.lists || []).map(normalizeGroupRow)
    return res
}

/**
 * 获取社交媒体分页列表（支持分组筛选）。
 */
const getItemLists = async () => {
    itemQueryParams.groupId = itemGroupFilter.value ?? ''
    const res = await getItemListsBase()
    itemPager.lists = (itemPager.lists || []).map(normalizeItemRow)
    return res
}

/**
 * 重置分组表单为默认值。
 */
const resetGroupForm = () => {
    Object.assign(groupData, {
        id: 0,
        name: '',
        icon: '',
        displayType: 'links',
        sortOrder: 0,
        isActive: true
    })
}

/**
 * 重置项目表单为默认值。
 */
const resetItemForm = () => {
    Object.assign(itemData, {
        id: 0,
        groupId: undefined,
        type: 'other',
        name: '',
        url: '',
        icon: '',
        qrCode: '',
        description: '',
        sortOrder: 0,
        isActive: true
    })
}

/**
 * 组装分组保存参数，保持与后端字段契约一致。
 */
const buildGroupPayload = () => {
    return {
        id: groupData.id || undefined,
        name: String(groupData.name || '').trim(),
        icon: String(groupData.icon || '').trim(),
        displayType: groupData.displayType,
        sortOrder: Number(groupData.sortOrder || 0),
        isShow: Boolean(groupData.isActive)
    }
}

/**
 * 组装项目保存参数，保持与后端字段契约一致。
 */
const buildItemPayload = () => {
    return {
        id: itemData.id || undefined,
        groupId: itemData.groupId,
        type: String(itemData.type || 'other').trim(),
        name: String(itemData.name || '').trim(),
        url: String(itemData.url || '').trim(),
        link: String(itemData.url || '').trim(),
        icon: String(itemData.icon || '').trim(),
        qrCode: String(itemData.qrCode || '').trim(),
        qrCodeUrl: String(itemData.qrCode || '').trim(),
        description: String(itemData.description || '').trim(),
        sortOrder: Number(itemData.sortOrder || 0),
        isShow: Boolean(itemData.isActive)
    }
}

/**
 * 打开“新增分组”弹窗。
 */
const handleAddGroup = () => {
    resetGroupForm()
    showGroupEdit.value = true
}

/**
 * 打开“编辑分组”弹窗并填充数据。
 * @param row 当前行
 */
const handleEditGroup = (row: any) => {
    Object.assign(groupData, normalizeGroupRow(row))
    showGroupEdit.value = true
}

/**
 * 在项目弹窗内快捷创建自定义分组。
 */
const handleCreateGroupFromItem = () => {
    reopenItemDialogAfterGroup.value = true
    showItemEdit.value = false
    handleAddGroup()
}

/**
 * 提交分组表单（新增/编辑）。
 */
const handleSubmitGroup = async () => {
    await groupFormRef.value?.validate()
    groupLoading.value = true
    try {
        const payload = buildGroupPayload()
        let createdGroupId: number | undefined
        if (payload.id) {
            await uiedSocialMediaGroupEdit(payload)
            feedback.msgSuccess('分组已更新')
        } else {
            const created = await uiedSocialMediaGroupAdd(payload)
            createdGroupId = Number(created?.id || 0) || undefined
            feedback.msgSuccess('分组已创建')
        }
        showGroupEdit.value = false
        await Promise.all([getGroupLists(), loadGroupOptions()])

        if (reopenItemDialogAfterGroup.value) {
            reopenItemDialogAfterGroup.value = false
            if (createdGroupId) {
                itemData.groupId = createdGroupId
            }
            showItemEdit.value = true
        }
    } finally {
        groupLoading.value = false
    }
}

/**
 * 删除分组（会级联隐藏分组下项目）。
 * @param id 分组ID
 */
const handleDeleteGroup = async (id: number) => {
    await feedback.confirm('确定删除该分组？分组下社交媒体将同步删除。')
    await uiedSocialMediaGroupDelete({ id })
    feedback.msgSuccess('分组已删除')
    await Promise.all([getGroupLists(), loadGroupOptions(), getItemLists()])
}

/**
 * 打开“新增项目”弹窗。
 */
const handleAddItem = () => {
    resetItemForm()
    showItemEdit.value = true
}

/**
 * 打开“编辑项目”弹窗并填充数据。
 * @param row 当前行
 */
const handleEditItem = (row: any) => {
    Object.assign(itemData, normalizeItemRow(row))
    showItemEdit.value = true
}

/**
 * 提交项目表单（新增/编辑）。
 */
const handleSubmitItem = async () => {
    await itemFormRef.value?.validate()
    itemLoading.value = true
    try {
        const payload = buildItemPayload()
        if (payload.id) {
            await uiedSocialMediaItemEdit(payload)
            feedback.msgSuccess('社交媒体已更新')
        } else {
            await uiedSocialMediaItemAdd(payload)
            feedback.msgSuccess('社交媒体已添加')
        }
        showItemEdit.value = false
        await getItemLists()
    } finally {
        itemLoading.value = false
    }
}

/**
 * 删除社交媒体项目。
 * @param id 项目ID
 */
const handleDeleteItem = async (id: number) => {
    await feedback.confirm('确定删除该社交媒体项目？')
    await uiedSocialMediaItemDelete({ id })
    feedback.msgSuccess('项目已删除')
    await getItemLists()
}

/**
 * 初始化页面数据。
 */
const initPageData = async () => {
    await Promise.all([getGroupLists(), getItemLists(), loadGroupOptions(), loadCategorySvgLibrary()])
}

initPageData()
</script>

<style lang="scss" scoped>
.social-media-setting {
    .social-media-card {
        border-radius: 12px;
    }

    .social-media-card__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }

    .social-media-card__title {
        font-size: 16px;
        font-weight: 600;
        color: var(--el-text-color-primary);
        line-height: 1.2;
    }

    .social-media-card__subtitle {
        margin-top: 6px;
        font-size: 13px;
        color: var(--el-text-color-secondary);
    }

    .social-media-tabs {
        margin-top: 2px;
    }

    .social-preview {
        border: 1px solid var(--el-border-color-light);
        border-radius: 12px;
        padding: 14px 16px;
        margin-bottom: 14px;
        background: var(--el-fill-color-extra-light);
    }

    .social-preview__header {
        margin-bottom: 10px;
    }

    .social-preview__title {
        font-size: 14px;
        font-weight: 600;
        color: var(--el-text-color-primary);
    }

    .social-preview__desc {
        margin-top: 4px;
        font-size: 12px;
        color: var(--el-text-color-secondary);
    }

    .social-preview__grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 10px;
    }

    .social-preview__item {
        display: flex;
        align-items: center;
        gap: 10px;
        min-height: 42px;
        padding: 8px 10px;
        border-radius: 10px;
        background: var(--el-bg-color-overlay);
        border: 1px solid var(--el-border-color-lighter);
    }

    .social-preview__icon {
        width: 28px;
        height: 28px;
        border-radius: 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        color: var(--el-text-color-primary);
        background: var(--el-fill-color-light);
        flex-shrink: 0;
        overflow: hidden;
    }

    .social-preview__icon-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    .social-preview__icon-svg :deep(svg) {
        width: 18px;
        height: 18px;
        display: block;
    }

    .social-preview__icon-text {
        font-size: 12px;
        font-weight: 600;
        line-height: 1;
    }

    .social-preview__name {
        font-size: 13px;
        color: var(--el-text-color-primary);
    }

    .panel-toolbar {
        margin-bottom: 14px;
    }

    .panel-toolbar--split {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-wrap: wrap;
    }

    .panel-toolbar__left,
    .panel-toolbar__right {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .icon-cell {
        display: flex;
        align-items: center;
        min-height: 34px;
    }

    .icon-cell__preview {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        border: 1px solid var(--el-border-color-lighter);
    }

    .icon-cell__svg {
        width: 32px;
        height: 32px;
        border-radius: 8px;
        border: 1px solid var(--el-border-color-lighter);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: #fff;
    }

    .icon-cell__svg :deep(svg) {
        width: 18px;
        height: 18px;
        display: block;
    }

    .icon-cell__svg--preview {
        width: 34px;
        height: 34px;
    }

    .icon-cell__text {
        font-size: 12px;
        color: var(--el-text-color-secondary);
    }

    .icon-editor {
        width: 100%;
    }

    .icon-editor__row {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .icon-editor__svg-picker {
        margin-top: 8px;
    }

    .icon-editor__tip {
        margin-top: 6px;
        font-size: 12px;
        color: var(--el-text-color-secondary);
    }

    .icon-editor__preview {
        margin-top: 8px;
        display: inline-flex;
        align-items: center;
    }

    .group-select-row {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 10px;
    }

    @media (max-width: 900px) {
        .social-preview__grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }

    @media (max-width: 640px) {
        .social-preview__grid {
            grid-template-columns: 1fr;
        }
    }
}
</style>
