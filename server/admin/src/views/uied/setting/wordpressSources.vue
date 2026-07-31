<!--
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-07-31
 */
-->
<template>
    <div class="wordpress-source-setting">
        <el-card shadow="never" class="wordpress-source-setting__card">
            <template #header>
                <div class="wordpress-source-setting__header">
                    <div>
                        <div class="wordpress-source-setting__title">WordPress 数据源</div>
                        <div class="wordpress-source-setting__description">
                            统一管理学习文章、热门文章和设计文章使用的外部内容接口。
                        </div>
                    </div>
                    <div class="wordpress-source-setting__actions">
                        <el-button :loading="testing" @click="handleTestDefaultSource">
                            测试默认源
                        </el-button>
                        <el-button :loading="loading" @click="loadSources">刷新</el-button>
                        <el-button
                            type="primary"
                            plain
                            :loading="saving"
                            @click="handleQuickConfigureUied"
                        >
                            一键配置 UIED
                        </el-button>
                        <el-button type="primary" @click="handleOpenCreate">新增数据源</el-button>
                    </div>
                </div>
            </template>

            <el-alert type="info" :closable="false" show-icon>
                <template #title>
                    UIED 学习文章推荐地址：
                    <code>{{ UIED_OPEN_POSTS_API_URL }}</code>
                </template>
                <div class="wordpress-source-setting__alert-description">
                    新接口已包含封面图、作者、分类、发布时间和浏览统计。历史 uied.cn/wp-json
                    地址在后端会自动兼容到新接口。
                </div>
            </el-alert>

            <div class="wordpress-source-setting__summary">
                <div class="wordpress-source-setting__summary-item">
                    <span>当前默认源</span>
                    <strong>{{ defaultSource?.name || 'UIED 内置默认源' }}</strong>
                </div>
                <div class="wordpress-source-setting__summary-item is-wide">
                    <span>生效地址</span>
                    <strong>{{ defaultSource?.apiUrl || UIED_OPEN_POSTS_API_URL }}</strong>
                </div>
                <div class="wordpress-source-setting__summary-item">
                    <span>缓存时间</span>
                    <strong>{{ formatCacheTime(defaultSource?.cacheTime) }}</strong>
                </div>
            </div>

            <el-table v-loading="loading" :data="sources" class="mt-4" empty-text="暂无自定义数据源">
                <el-table-column label="默认" width="80" align="center">
                    <template #default="{ row }">
                        <el-tag v-if="row.isDefault" type="success" effect="plain">默认</el-tag>
                        <span v-else class="wordpress-source-setting__muted">-</span>
                    </template>
                </el-table-column>
                <el-table-column label="名称" prop="name" min-width="150" />
                <el-table-column label="API 地址" min-width="360">
                    <template #default="{ row }">
                        <div class="wordpress-source-setting__url-cell">
                            <span>{{ row.apiUrl }}</span>
                            <el-tag size="small" effect="plain">{{ resolveSourceType(row.apiUrl) }}</el-tag>
                        </div>
                    </template>
                </el-table-column>
                <el-table-column label="状态" width="90" align="center">
                    <template #default="{ row }">
                        <el-tag :type="row.enabled ? 'success' : 'info'">
                            {{ row.enabled ? '已启用' : '已停用' }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="缓存" width="110" align="center">
                    <template #default="{ row }">{{ formatCacheTime(row.cacheTime) }}</template>
                </el-table-column>
                <el-table-column label="操作" width="240" fixed="right">
                    <template #default="{ row }">
                        <el-button
                            v-if="!row.isDefault"
                            type="success"
                            link
                            @click="handleSetDefault(row)"
                        >
                            设为默认
                        </el-button>
                        <el-button type="primary" link @click="handleOpenEdit(row)">编辑</el-button>
                        <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
                    </template>
                </el-table-column>
            </el-table>

            <div v-if="testResult" class="wordpress-source-setting__test-result">
                <div class="wordpress-source-setting__test-head">
                    <div>
                        <strong>连接测试成功</strong>
                        <span>已返回 {{ testResult.count }} 条文章</span>
                    </div>
                    <el-button link @click="testResult = null">关闭</el-button>
                </div>
                <div v-if="testResult.sample" class="wordpress-source-setting__sample">
                    <el-image
                        v-if="testResult.sample.thumbnail"
                        :src="testResult.sample.thumbnail"
                        fit="cover"
                        class="wordpress-source-setting__sample-cover"
                    />
                    <div v-else class="wordpress-source-setting__sample-cover is-empty">暂无封面</div>
                    <div class="wordpress-source-setting__sample-body">
                        <strong>{{ testResult.sample.name || '未命名文章' }}</strong>
                        <span>{{ testResult.sample.authorName || '未知作者' }}</span>
                        <a
                            v-if="testResult.sample.link"
                            :href="testResult.sample.link"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            打开文章
                        </a>
                    </div>
                </div>
            </div>
        </el-card>

        <el-dialog
            v-model="dialogVisible"
            :title="formData.id ? '编辑 WordPress 数据源' : '新增 WordPress 数据源'"
            width="620px"
            destroy-on-close
        >
            <el-form ref="formRef" :model="formData" :rules="formRules" label-width="110px">
                <el-form-item label="数据源名称" prop="name">
                    <el-input v-model="formData.name" maxlength="128" placeholder="例如：UIED 学习文章" />
                </el-form-item>
                <el-form-item label="API 地址" prop="apiUrl">
                    <el-input
                        v-model="formData.apiUrl"
                        placeholder="https://www.uied.cn/api/open/v1/posts"
                    />
                    <div class="wordpress-source-setting__form-tip">
                        支持 UIED 开放文章流完整地址，或标准 WordPress wp-json/wp/v2 地址。
                    </div>
                </el-form-item>
                <el-form-item label="缓存时间" prop="cacheTime">
                    <el-input-number
                        v-model="formData.cacheTime"
                        :min="30"
                        :max="86400"
                        :step="30"
                    />
                    <span class="wordpress-source-setting__form-suffix">秒</span>
                </el-form-item>
                <el-form-item label="启用数据源">
                    <el-switch v-model="formData.enabled" @change="handleEnabledChange" />
                </el-form-item>
                <el-form-item label="设为默认">
                    <el-switch v-model="formData.isDefault" @change="handleDefaultChange" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="dialogVisible = false">取消</el-button>
                <el-button type="primary" :loading="saving" @click="handleSave">保存配置</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script lang="ts" setup>
import { onMounted, reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import feedback from '@/utils/feedback'
import {
    uiedWordpressConfigAdd,
    uiedWordpressConfigDefault,
    uiedWordpressConfigDel,
    uiedWordpressConfigEdit,
    uiedWordpressConfigList,
    uiedWordpressPostList
} from '@/api/uied'

interface WordpressSourceRow {
    id: number
    name: string
    apiUrl: string
    enabled: boolean
    isDefault: boolean
    cacheTime: number
    createdAt?: number
}

interface WordpressSourceForm {
    id: number
    name: string
    apiUrl: string
    enabled: boolean
    isDefault: boolean
    cacheTime: number
}

interface WordpressPostSample {
    name?: string
    thumbnail?: string
    authorName?: string
    link?: string
}

interface WordpressTestResult {
    count: number
    sample: WordpressPostSample | null
}

const UIED_OPEN_POSTS_API_URL = 'https://www.uied.cn/api/open/v1/posts'
const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const dialogVisible = ref(false)
const sources = ref<WordpressSourceRow[]>([])
const defaultSource = ref<WordpressSourceRow | null>(null)
const testResult = ref<WordpressTestResult | null>(null)
const formRef = ref<FormInstance>()
const formData = reactive<WordpressSourceForm>({
    id: 0,
    name: '',
    apiUrl: UIED_OPEN_POSTS_API_URL,
    enabled: true,
    isDefault: true,
    cacheTime: 300
})

/**
 * 校验数据源地址必须是完整的 HTTP(S) URL。
 */
const validateApiUrl = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
    try {
        const url = new URL(String(value || '').trim())
        if (!['http:', 'https:'].includes(url.protocol)) {
            callback(new Error('仅支持 HTTP 或 HTTPS 地址'))
            return
        }
        callback()
    } catch (_error) {
        callback(new Error('请输入完整有效的 API 地址'))
    }
}

const formRules: FormRules = {
    name: [{ required: true, message: '请输入数据源名称', trigger: 'blur' }],
    apiUrl: [{ required: true, validator: validateApiUrl, trigger: 'blur' }],
    cacheTime: [{ required: true, message: '请设置缓存时间', trigger: 'change' }]
}

/**
 * 兼容解析接口列表，避免不同请求封装层级导致空表。
 */
const normalizeSourceRows = (payload: any): WordpressSourceRow[] => {
    const rows = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload?.list)
            ? payload.list
            : []
    return rows.map((item: any) => ({
        id: Number(item?.id || 0),
        name: String(item?.name || '').trim(),
        apiUrl: String(item?.apiUrl || item?.api_url || '').trim(),
        enabled: item?.enabled === true || Number(item?.enabled) === 1,
        isDefault: item?.isDefault === true || Number(item?.is_default) === 1,
        cacheTime: Math.max(30, Number(item?.cacheTime || item?.cache_time || 300)),
        createdAt: Number(item?.createdAt || item?.create_time || 0)
    }))
}

/**
 * 规范化单个默认数据源响应。
 */
const normalizeDefaultSource = (payload: any): WordpressSourceRow | null => {
    const data = payload?.data && !Array.isArray(payload?.data) ? payload.data : payload
    if (!data || typeof data !== 'object') return null
    return {
        id: Number(data?.id || 0),
        name: String(data?.name || 'UIED 内置默认源').trim(),
        apiUrl: String(data?.apiUrl || data?.api_url || UIED_OPEN_POSTS_API_URL).trim(),
        enabled: data?.enabled !== false,
        isDefault: data?.isDefault !== false,
        cacheTime: Math.max(30, Number(data?.cacheTime || data?.cache_time || 300)),
        createdAt: Number(data?.createdAt || data?.create_time || 0)
    }
}

/**
 * 读取数据源列表与当前默认源。
 */
const loadSources = async () => {
    loading.value = true
    try {
        const [listPayload, defaultPayload] = await Promise.all([
            uiedWordpressConfigList(),
            uiedWordpressConfigDefault()
        ])
        sources.value = normalizeSourceRows(listPayload)
        defaultSource.value = normalizeDefaultSource(defaultPayload)
    } catch (error) {
        console.error('加载 WordPress 数据源失败:', error)
        feedback.msgError('加载 WordPress 数据源失败')
    } finally {
        loading.value = false
    }
}

/**
 * 重置数据源编辑表单。
 */
const resetForm = () => {
    Object.assign(formData, {
        id: 0,
        name: '',
        apiUrl: UIED_OPEN_POSTS_API_URL,
        enabled: true,
        isDefault: sources.value.length === 0,
        cacheTime: 300
    })
    formRef.value?.clearValidate()
}

/**
 * 打开新增数据源弹窗。
 */
const handleOpenCreate = () => {
    resetForm()
    dialogVisible.value = true
}

/**
 * 打开编辑数据源弹窗。
 */
const handleOpenEdit = (row: WordpressSourceRow) => {
    Object.assign(formData, {
        id: row.id,
        name: row.name,
        apiUrl: row.apiUrl,
        enabled: row.enabled,
        isDefault: row.isDefault,
        cacheTime: row.cacheTime
    })
    dialogVisible.value = true
}

/**
 * 停用数据源时同步取消默认状态，避免保存出矛盾配置。
 */
const handleEnabledChange = (enabled: string | number | boolean) => {
    if (!enabled) formData.isDefault = false
}

/**
 * 设为默认源时自动启用，保证默认源始终可读取。
 */
const handleDefaultChange = (isDefault: string | number | boolean) => {
    if (isDefault) formData.enabled = true
}

/**
 * 保存新增或编辑的数据源。
 */
const handleSave = async () => {
    const valid = await formRef.value?.validate().catch(() => false)
    if (!valid) return

    saving.value = true
    try {
        const payload = {
            id: formData.id || undefined,
            name: String(formData.name || '').trim(),
            apiUrl: String(formData.apiUrl || '').trim().replace(/\/+$/, ''),
            enabled: formData.enabled,
            isDefault: formData.isDefault,
            cacheTime: Math.max(30, Math.min(86400, Number(formData.cacheTime || 300)))
        }
        if (formData.id > 0) {
            await uiedWordpressConfigEdit(payload)
        } else {
            await uiedWordpressConfigAdd(payload)
        }
        feedback.msgSuccess('WordPress 数据源保存成功')
        dialogVisible.value = false
        await loadSources()
    } catch (error) {
        console.error('保存 WordPress 数据源失败:', error)
        feedback.msgError('保存 WordPress 数据源失败')
    } finally {
        saving.value = false
    }
}

/**
 * 判断地址是否属于 UIED 数据源，兼容历史 wp-json 地址。
 */
const isUiedSourceUrl = (apiUrl: string): boolean => {
    try {
        const hostname = new URL(String(apiUrl || '').trim()).hostname.toLowerCase()
        return hostname === 'uied.cn' || hostname === 'www.uied.cn'
    } catch (_error) {
        return false
    }
}

/**
 * 一键新增或迁移 UIED 开放文章流，并设为默认源。
 */
const handleQuickConfigureUied = async () => {
    const existing = sources.value.find((item) => isUiedSourceUrl(item.apiUrl))
    saving.value = true
    try {
        const payload = {
            id: existing?.id,
            name: existing?.name || 'UIED 学习文章',
            apiUrl: UIED_OPEN_POSTS_API_URL,
            enabled: true,
            isDefault: true,
            cacheTime: 300
        }
        if (existing?.id) {
            await uiedWordpressConfigEdit(payload)
        } else {
            await uiedWordpressConfigAdd(payload)
        }
        feedback.msgSuccess('UIED 开放文章流已设为默认数据源')
        await loadSources()
        await handleTestDefaultSource()
    } catch (error) {
        console.error('一键配置 UIED 数据源失败:', error)
        feedback.msgError('一键配置 UIED 数据源失败')
    } finally {
        saving.value = false
    }
}

/**
 * 将指定数据源启用并设为默认。
 */
const handleSetDefault = async (row: WordpressSourceRow) => {
    try {
        await uiedWordpressConfigEdit({ id: row.id, enabled: true, isDefault: true })
        feedback.msgSuccess(`已将“${row.name}”设为默认数据源`)
        await loadSources()
    } catch (error) {
        console.error('设置默认 WordPress 数据源失败:', error)
        feedback.msgError('设置默认数据源失败')
    }
}

/**
 * 删除指定数据源，系统会自动选择其他启用源，无可用源时回退 UIED 内置源。
 */
const handleDelete = async (row: WordpressSourceRow) => {
    try {
        await feedback.confirm(`确定删除数据源“${row.name}”吗？`)
        await uiedWordpressConfigDel({ id: row.id })
        feedback.msgSuccess('WordPress 数据源已删除')
        await loadSources()
    } catch (error: any) {
        if (error === 'cancel' || error === 'close') return
        console.error('删除 WordPress 数据源失败:', error)
        feedback.msgError('删除 WordPress 数据源失败')
    }
}

/**
 * 测试当前默认源并展示一条真实文章及封面。
 */
const handleTestDefaultSource = async () => {
    testing.value = true
    testResult.value = null
    try {
        const payload: any = await uiedWordpressPostList({
            source: 'auto',
            page: 1,
            perPage: 3,
            orderBy: 'date',
            order: 'desc',
            diagnostic: 1
        })
        const rows = Array.isArray(payload)
            ? payload
            : Array.isArray(payload?.data)
              ? payload.data
              : []
        if (rows.length === 0) {
            feedback.msgWarning('接口连接成功，但当前没有返回文章，请检查数据源内容')
            return
        }
        testResult.value = {
            count: rows.length,
            sample: rows[0] as WordpressPostSample
        }
        feedback.msgSuccess('默认数据源连接正常')
    } catch (error) {
        console.error('测试 WordPress 数据源失败:', error)
        feedback.msgError('数据源连接失败，请检查 API 地址和服务器网络')
    } finally {
        testing.value = false
    }
}

/**
 * 识别数据源类型，便于运营区分开放文章流与标准 WordPress。
 */
const resolveSourceType = (apiUrl: string): string => {
    if (String(apiUrl || '').includes('/api/open/v1/posts')) return '开放文章流'
    if (isUiedSourceUrl(apiUrl)) return 'UIED 自动兼容'
    return 'WordPress v2'
}

/**
 * 把缓存秒数转换为易读文案。
 */
const formatCacheTime = (value: unknown): string => {
    const seconds = Math.max(30, Number(value || 300))
    if (seconds >= 3600 && seconds % 3600 === 0) return `${seconds / 3600} 小时`
    if (seconds >= 60 && seconds % 60 === 0) return `${seconds / 60} 分钟`
    return `${seconds} 秒`
}

onMounted(loadSources)
</script>

<style scoped>
.wordpress-source-setting__card {
    border-radius: 10px;
}

.wordpress-source-setting__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
}

.wordpress-source-setting__title {
    color: var(--el-text-color-primary);
    font-size: 16px;
    font-weight: 600;
}

.wordpress-source-setting__description,
.wordpress-source-setting__alert-description,
.wordpress-source-setting__form-tip,
.wordpress-source-setting__muted {
    color: var(--el-text-color-secondary);
    font-size: 12px;
    line-height: 1.6;
}

.wordpress-source-setting__description {
    margin-top: 5px;
}

.wordpress-source-setting__actions {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
}

.wordpress-source-setting__alert-description {
    margin-top: 4px;
}

.wordpress-source-setting__summary {
    display: grid;
    grid-template-columns: minmax(150px, 0.8fr) minmax(320px, 2fr) minmax(120px, 0.6fr);
    gap: 12px;
    margin-top: 16px;
}

.wordpress-source-setting__summary-item {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 6px;
    padding: 14px 16px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    background: var(--el-fill-color-lighter);
}

.wordpress-source-setting__summary-item span {
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

.wordpress-source-setting__summary-item strong {
    overflow: hidden;
    color: var(--el-text-color-primary);
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.wordpress-source-setting__url-cell {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 8px;
}

.wordpress-source-setting__url-cell span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.wordpress-source-setting__test-result {
    margin-top: 16px;
    padding: 16px;
    border: 1px solid var(--el-color-success-light-7);
    border-radius: 8px;
    background: var(--el-color-success-light-9);
}

.wordpress-source-setting__test-head,
.wordpress-source-setting__test-head > div {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

.wordpress-source-setting__test-head span {
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

.wordpress-source-setting__sample {
    display: flex;
    gap: 14px;
    margin-top: 14px;
}

.wordpress-source-setting__sample-cover {
    width: 128px;
    height: 78px;
    flex: 0 0 auto;
    border-radius: 7px;
    background: var(--el-fill-color);
}

.wordpress-source-setting__sample-cover.is-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--el-text-color-placeholder);
    font-size: 12px;
}

.wordpress-source-setting__sample-body {
    display: flex;
    min-width: 0;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
}

.wordpress-source-setting__sample-body strong {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.wordpress-source-setting__sample-body span,
.wordpress-source-setting__sample-body a {
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

.wordpress-source-setting__sample-body a {
    color: var(--el-color-primary);
}

.wordpress-source-setting__form-tip {
    margin-top: 5px;
}

.wordpress-source-setting__form-suffix {
    margin-left: 8px;
    color: var(--el-text-color-secondary);
}

@media (max-width: 900px) {
    .wordpress-source-setting__header {
        flex-direction: column;
    }

    .wordpress-source-setting__actions {
        justify-content: flex-start;
    }

    .wordpress-source-setting__summary {
        grid-template-columns: 1fr;
    }
}
</style>
