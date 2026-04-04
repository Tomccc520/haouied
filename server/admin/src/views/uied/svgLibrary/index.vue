<!--
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-05
 */
-->
<template>
    <div class="svg-library-page">
        <el-card class="!border-none" shadow="never">
            <div class="svg-library-page__header">
                <h2 class="svg-library-page__title">SVG 图标库</h2>
                <p class="svg-library-page__desc">
                    在这里统一维护分类图标库。页面分类配置中可直接使用
                    <code>svg:key</code> 引用。
                </p>
                <div class="svg-library-page__recommend">
                    <span class="svg-library-page__recommend-label">免费图标推荐：</span>
                    <el-link
                        type="primary"
                        href="https://hao.uied.cn/category/uiux-design-resources-icons"
                        target="_blank"
                    >
                        https://hao.uied.cn/category/uiux-design-resources-icons
                    </el-link>
                </div>
            </div>

            <div class="svg-library-page__toolbar">
                <el-button type="primary" :loading="saveLoading" @click="handleSave">
                    保存图标库
                </el-button>
                <el-button :loading="loading" @click="handleReload">重新加载</el-button>
                <el-button plain v-copy="categorySvgLibraryText">复制图标库 JSON</el-button>
                <span class="svg-library-page__toolbar-tip">
                    图标库更新后会实时影响页面分类配置中的 svg:key 选择。
                </span>
            </div>

            <el-tabs v-model="svgLibraryTab" class="svg-library-page__tabs">
                <el-tab-pane :label="`已上传图标（${categorySvgLibraryTotal}）`" name="library">
                    <div class="svg-library-page__preview">
                        <div class="svg-library-page__preview-toolbar">
                            <div class="svg-library-page__preview-summary">
                                共 {{ categorySvgLibraryTotal }} 个图标
                                <span
                                    v-if="categorySvgLibraryPreviewCount !== categorySvgLibraryTotal"
                                    class="svg-library-page__preview-summary-sub"
                                >
                                    （当前筛选 {{ categorySvgLibraryPreviewCount }} 个）
                                </span>
                            </div>
                            <div class="svg-library-page__preview-filter">
                                <el-input
                                    v-model="previewKeyword"
                                    clearable
                                    placeholder="搜索 key / 名称"
                                />
                                <el-switch
                                    v-model="previewOnlyRecent"
                                    inline-prompt
                                    active-text="最近新增"
                                    inactive-text="全部"
                                />
                            </div>
                        </div>

                        <div class="svg-library-page__preview-grid">
                            <div
                                v-for="item in categorySvgLibraryPreview"
                                :key="item.key"
                                class="svg-library-page__preview-item"
                                :class="{ 'is-recent': isRecentSvgIcon(item.key) }"
                            >
                                <div class="svg-library-page__preview-icon-wrap">
                                    <span
                                        class="svg-library-page__preview-icon"
                                        aria-hidden="true"
                                        v-html="item.svg"
                                    />
                                </div>
                                <div class="svg-library-page__preview-meta">
                                    <div class="svg-library-page__preview-label">
                                        {{ item.label }}
                                    </div>
                                    <div class="svg-library-page__preview-key">svg:{{ item.key }}</div>
                                </div>
                                <div class="svg-library-page__preview-actions">
                                    <el-button link type="primary" v-copy="item.svg">
                                        复制SVG代码
                                    </el-button>
                                    <el-button link type="info" v-copy="`svg:${item.key}`">
                                        复制Key
                                    </el-button>
                                    <el-button link type="danger" @click="removeCategorySvgItem(item.key)">
                                        移除
                                    </el-button>
                                </div>
                            </div>
                        </div>
                        <span
                            v-if="categorySvgLibraryPreview.length === 0"
                            class="svg-library-page__preview-empty"
                        >
                            暂无图标，请切到“上传图标”新增 SVG。
                        </span>
                    </div>
                </el-tab-pane>

                <el-tab-pane label="上传图标" name="upload">
                    <el-alert
                        type="info"
                        show-icon
                        :closable="false"
                        class="svg-library-page__alert"
                        title="上传后会先更新当前编辑区，确认无误后点击“保存图标库”写入后台配置。"
                    />

                    <div class="svg-library-page__upload-toolbar">
                        <el-upload
                            action="#"
                            accept=".svg,image/svg+xml"
                            :auto-upload="false"
                            :show-file-list="false"
                            :multiple="true"
                            :on-change="handleCategorySvgUpload"
                        >
                            <el-button type="primary" plain :loading="uploadLoading">
                                上传 SVG 文件
                            </el-button>
                        </el-upload>
                        <span class="svg-library-page__toolbar-tip">
                            支持多选；若 key 重复会自动追加序号。
                        </span>
                    </div>

                    <el-form label-width="120px" class="svg-library-page__upload-form">
                        <el-form-item label="粘贴SVG代码">
                            <div class="svg-library-page__paste-wrap">
                                <div class="svg-library-page__paste-head">
                                    <el-input
                                        v-model="pasteSvgKey"
                                        placeholder="可选：自定义 key（会自动补齐 uied_ 前缀）"
                                        clearable
                                    />
                                    <el-input
                                        v-model="pasteSvgLabel"
                                        placeholder="可选：图标名称（用于展示）"
                                        clearable
                                    />
                                    <el-button type="primary" :loading="pasteLoading" @click="handleAddSvgFromCode">
                                        添加到图标库
                                    </el-button>
                                </div>
                                <el-input
                                    v-model="pasteSvgCode"
                                    type="textarea"
                                    :rows="6"
                                    placeholder="把复制的 SVG 代码粘贴到这里，例如：<svg ...>...</svg>"
                                />
                                <p class="svg-library-page__paste-tip">
                                    不填 key 时会自动生成 uied_ 前缀命名；若 key 重复会自动追加后缀。支持从整段内容中自动提取第一个 SVG。
                                </p>
                            </div>
                        </el-form-item>

                        <el-form-item label="图标库 JSON（高级）">
                            <div class="svg-library-page__json-wrap">
                                <el-input
                                    v-model="categorySvgLibraryText"
                                    type="textarea"
                                    :rows="14"
                                    placeholder='[{"key":"ai_video","label":"AI视频","svg":"<svg ...></svg>"}]'
                                    @blur="syncCategorySvgLibraryFromText"
                                />
                                <div v-if="categorySvgLibraryError" class="svg-library-page__error">
                                    {{ categorySvgLibraryError }}
                                </div>
                            </div>
                        </el-form-item>
                    </el-form>
                </el-tab-pane>
            </el-tabs>
        </el-card>
    </div>
</template>

<script lang="ts" setup name="uiedSvgLibrary">
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-05
 */
import { computed, onMounted, ref } from 'vue'
import feedback from '@/utils/feedback'
import { uiedSettingGet, uiedSettingSave } from '@/api/uied'

interface CategorySvgLibraryItem {
    key: string
    label: string
    svg: string
}

const SVG_LIBRARY_KEY_PREFIX = 'uied_'

const loading = ref(false)
const saveLoading = ref(false)
const uploadLoading = ref(false)
const pasteLoading = ref(false)
const categorySvgLibraryText = ref('[]')
const categorySvgLibraryError = ref('')
const categorySvgLibrary = ref<CategorySvgLibraryItem[]>([])
const svgLibraryTab = ref<'library' | 'upload'>('library')
const pasteSvgCode = ref('')
const pasteSvgKey = ref('')
const pasteSvgLabel = ref('')
const previewKeyword = ref('')
const previewOnlyRecent = ref(false)
const recentSvgKeys = ref<string[]>([])

/**
 * 清洗 SVG 字符串，去除脚本与内联事件，避免配置注入风险。
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
 * 规范化 SVG 图标库，兼容数组/对象/JSON 字符串格式。
 */
const normalizeCategorySvgLibrary = (value: unknown): CategorySvgLibraryItem[] => {
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
        .filter((item): item is CategorySvgLibraryItem & { sort: number } => Boolean(item))
        .sort((a, b) => a.sort - b.sort)
        .map(({ key, label, svg }) => ({ key, label, svg }))
}

/**
 * 将图标库格式化为便于运营编辑的 JSON 文本。
 */
const formatCategorySvgLibraryText = (value: unknown): string =>
    JSON.stringify(normalizeCategorySvgLibrary(value), null, 2)

/**
 * 统一新增图标 key 前缀，避免运营上传后命名分散。
 */
const ensureSvgLibraryKeyPrefix = (value: unknown): string => {
    const rawKey = String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '')
        .slice(0, 40)
    if (!rawKey) return SVG_LIBRARY_KEY_PREFIX
    if (rawKey.startsWith(SVG_LIBRARY_KEY_PREFIX)) return rawKey
    return `${SVG_LIBRARY_KEY_PREFIX}${rawKey}`.slice(0, 40)
}

/**
 * 清理“最近新增”记录，避免删除或重载后引用失效 key。
 */
const syncRecentSvgKeys = (list: CategorySvgLibraryItem[]) => {
    const validKeySet = new Set(list.map((item) => item.key))
    recentSvgKeys.value = recentSvgKeys.value.filter((key) => validKeySet.has(key))
}

/**
 * 标记最新新增的图标 key，用于预览区高亮。
 */
const markRecentSvgKeys = (keys: string[]) => {
    const normalized = keys
        .map((key) => String(key || '').trim().toLowerCase())
        .filter(Boolean)
    const merged = [...normalized, ...recentSvgKeys.value]
    recentSvgKeys.value = Array.from(new Set(merged)).slice(0, 20)
}

/**
 * 将 JSON 文本同步到图标库对象，保存前执行一次可保证数据有效。
 */
const syncCategorySvgLibraryFromText = (): boolean => {
    const text = String(categorySvgLibraryText.value || '').trim()
    if (!text) {
        categorySvgLibrary.value = []
        categorySvgLibraryError.value = ''
        categorySvgLibraryText.value = '[]'
        return true
    }
    try {
        const parsed = JSON.parse(text)
        const normalized = normalizeCategorySvgLibrary(parsed)
        categorySvgLibrary.value = normalized
        syncRecentSvgKeys(normalized)
        categorySvgLibraryText.value = formatCategorySvgLibraryText(normalized)
        categorySvgLibraryError.value = ''
        return true
    } catch (_error) {
        categorySvgLibraryError.value = '图标库 JSON 格式错误，请检查括号与引号后重试'
        return false
    }
}

/**
 * 读取本地文件文本内容，用于解析上传的 SVG 源码。
 */
const readLocalTextFile = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result || ''))
        reader.onerror = () => reject(new Error('读取文件失败'))
        reader.readAsText(file, 'utf-8')
    })

/**
 * 根据文件名生成图标库 key（仅保留 a-z0-9_-），并控制长度。
 */
const buildSvgKeyFromFileName = (fileName: unknown): string => {
    const baseName = String(fileName || '')
        .replace(/\.svg$/i, '')
        .trim()
        .toLowerCase()
        .replace(/[\s.]+/g, '_')
        .replace(/[^a-z0-9_-]/g, '')
        .slice(0, 40)
    return ensureSvgLibraryKeyPrefix(baseName || 'svg_icon')
}

/**
 * 从自由文本中提取第一个完整的 SVG 片段，兼容“复制整段代码”的场景。
 */
const extractFirstSvgMarkup = (value: unknown): string => {
    const text = String(value || '').trim()
    if (!text) return ''
    const matched = text.match(/<svg[\s\S]*?<\/svg>/i)
    return matched ? String(matched[0] || '').trim() : text
}

/**
 * 生成不冲突的 svg:key。若 key 已存在，自动追加 _2/_3... 后缀。
 */
const generateUniqueSvgLibraryKey = (
    baseKey: string,
    currentList: CategorySvgLibraryItem[]
): string => {
    const existingKeySet = new Set(
        (currentList || []).map((item) => String(item?.key || '').trim().toLowerCase())
    )
    if (!existingKeySet.has(baseKey)) return baseKey
    for (let index = 2; index <= 9999; index += 1) {
        const nextKey = `${baseKey}_${index}`.slice(0, 40)
        if (!existingKeySet.has(nextKey)) return nextKey
    }
    return `${baseKey}_${Date.now()}`.slice(0, 40)
}

/**
 * 根据用户输入（手动 key/label 或代码）生成图标库条目基础信息。
 */
const resolveSvgMeta = (rawCode: string): { key: string; label: string } => {
    const sanitizedManualKey = ensureSvgLibraryKeyPrefix(String(pasteSvgKey.value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '')
        .slice(0, 40))
    const sanitizedLabel = String(pasteSvgLabel.value || '').trim().slice(0, 40)
    const codeBasedKey = buildSvgKeyFromFileName(
        sanitizedLabel || `svg_${String(rawCode.length || 0)}`
    )
    return {
        key: sanitizedManualKey || codeBasedKey || 'svg_icon',
        label: sanitizedLabel
    }
}

/**
 * 上传 SVG 并追加到图标库（仅更新本地表单，需手动保存才写入后端）。
 */
const handleCategorySvgUpload = async (uploadFile: any) => {
    const rawFile = uploadFile?.raw as File | undefined
    if (!rawFile) return
    const fileName = String(rawFile.name || '').trim()
    const isSvgFile = /\.svg$/i.test(fileName) || String(rawFile.type || '') === 'image/svg+xml'
    if (!isSvgFile) {
        feedback.msgWarning('仅支持上传 .svg 文件')
        return
    }
    if (Number(rawFile.size || 0) > 1024 * 1024) {
        feedback.msgWarning('SVG 文件不能超过 1MB')
        return
    }

    uploadLoading.value = true
    try {
        const rawSvg = await readLocalTextFile(rawFile)
        const sanitizedSvg = sanitizeSvgMarkup(rawSvg)
        if (!sanitizedSvg) {
            feedback.msgWarning(`文件 ${fileName} 不是有效 SVG，已跳过`)
            return
        }
        const currentList = normalizeCategorySvgLibrary(categorySvgLibrary.value)
        const baseKey = buildSvgKeyFromFileName(fileName)
        const uniqueKey = generateUniqueSvgLibraryKey(baseKey, currentList)
        const label = String(fileName.replace(/\.svg$/i, '') || uniqueKey)
            .trim()
            .slice(0, 40)
        const nextList = normalizeCategorySvgLibrary([
            ...currentList,
            { key: uniqueKey, label: label || uniqueKey, svg: sanitizedSvg }
        ])
        categorySvgLibrary.value = nextList
        syncRecentSvgKeys(nextList)
        markRecentSvgKeys([uniqueKey])
        svgLibraryTab.value = 'library'
        categorySvgLibraryText.value = formatCategorySvgLibraryText(nextList)
        categorySvgLibraryError.value = ''
        feedback.msgSuccess(`已添加图标：svg:${uniqueKey}`)
    } catch (error) {
        console.error('上传 SVG 图标失败:', error)
        feedback.msgError('上传 SVG 图标失败，请重试')
    } finally {
        uploadLoading.value = false
    }
}

/**
 * 通过粘贴 SVG 代码新增图标项：提取 SVG -> 清洗 -> 自动分配 key -> 写入编辑区。
 */
const handleAddSvgFromCode = async () => {
    const rawInput = String(pasteSvgCode.value || '').trim()
    if (!rawInput) {
        feedback.msgWarning('请先粘贴 SVG 代码')
        return
    }
    pasteLoading.value = true
    try {
        const extractedSvg = extractFirstSvgMarkup(rawInput)
        const sanitizedSvg = sanitizeSvgMarkup(extractedSvg)
        if (!sanitizedSvg) {
            feedback.msgWarning('未识别到有效的 SVG 代码')
            return
        }
        const currentList = normalizeCategorySvgLibrary(categorySvgLibrary.value)
        const { key: baseKey, label } = resolveSvgMeta(sanitizedSvg)
        const uniqueKey = generateUniqueSvgLibraryKey(baseKey, currentList)
        const nextLabel = label || uniqueKey
        const nextList = normalizeCategorySvgLibrary([
            ...currentList,
            { key: uniqueKey, label: nextLabel, svg: sanitizedSvg }
        ])
        categorySvgLibrary.value = nextList
        syncRecentSvgKeys(nextList)
        markRecentSvgKeys([uniqueKey])
        svgLibraryTab.value = 'library'
        categorySvgLibraryText.value = formatCategorySvgLibraryText(nextList)
        categorySvgLibraryError.value = ''
        pasteSvgCode.value = ''
        pasteSvgKey.value = ''
        pasteSvgLabel.value = ''
        feedback.msgSuccess(`已添加图标：svg:${uniqueKey}`)
    } catch (error) {
        console.error('粘贴 SVG 代码添加失败:', error)
        feedback.msgError('添加失败，请检查 SVG 代码后重试')
    } finally {
        pasteLoading.value = false
    }
}

/**
 * 移除指定 key 的图标项，并同步 JSON 文本。
 */
const removeCategorySvgItem = (key: string) => {
    categorySvgLibrary.value = categorySvgLibrary.value.filter((item) => item.key !== key)
    syncRecentSvgKeys(categorySvgLibrary.value)
    categorySvgLibraryText.value = formatCategorySvgLibraryText(categorySvgLibrary.value)
    categorySvgLibraryError.value = ''
}

/**
 * 从后端读取图标库配置并填充到编辑器。
 */
const loadCategorySvgLibrary = async () => {
    loading.value = true
    try {
        const res = await uiedSettingGet({ key: 'pageGlobalConfig' })
        const normalized = normalizeCategorySvgLibrary((res as any)?.categorySvgLibrary)
        categorySvgLibrary.value = normalized
        syncRecentSvgKeys(normalized)
        categorySvgLibraryText.value = formatCategorySvgLibraryText(normalized)
        categorySvgLibraryError.value = ''
    } catch (error) {
        console.error('加载 SVG 图标库失败:', error)
        feedback.msgError('加载失败')
    } finally {
        loading.value = false
    }
}

/**
 * 保存图标库到 pageGlobalConfig.categorySvgLibrary。
 */
const handleSave = async () => {
    if (!syncCategorySvgLibraryFromText()) {
        feedback.msgError(categorySvgLibraryError.value || '图标库配置格式错误')
        return
    }
    saveLoading.value = true
    try {
        await uiedSettingSave({
            pageGlobalConfig: {
                categorySvgLibrary: normalizeCategorySvgLibrary(categorySvgLibrary.value)
            }
        })
        feedback.msgSuccess('保存成功')
    } catch (error) {
        console.error('保存 SVG 图标库失败:', error)
        feedback.msgError('保存失败')
    } finally {
        saveLoading.value = false
    }
}

/**
 * 手动刷新当前页面数据，重新拉取后端图标库。
 */
const handleReload = async () => {
    await loadCategorySvgLibrary()
}

/**
 * 归一化后的图标库数据，供预览统计和筛选复用。
 */
const normalizedCategorySvgLibrary = computed(() =>
    normalizeCategorySvgLibrary(categorySvgLibrary.value)
)

/**
 * 图标库预览筛选结果，支持按关键字和“最近新增”过滤。
 */
const categorySvgLibraryPreview = computed(() => {
    const keyword = String(previewKeyword.value || '')
        .trim()
        .toLowerCase()
    return normalizedCategorySvgLibrary.value.filter((item) => {
        if (previewOnlyRecent.value && !recentSvgKeys.value.includes(item.key)) return false
        if (!keyword) return true
        return (
            String(item.key || '').toLowerCase().includes(keyword) ||
            String(item.label || '').toLowerCase().includes(keyword)
        )
    })
})

/**
 * 图标库总数，用于预览区汇总显示。
 */
const categorySvgLibraryTotal = computed(() => normalizedCategorySvgLibrary.value.length)

/**
 * 当前筛选结果数量。
 */
const categorySvgLibraryPreviewCount = computed(() => categorySvgLibraryPreview.value.length)

/**
 * 判断图标是否属于最近新增集合，用于卡片高亮。
 */
const isRecentSvgIcon = (key: string): boolean => recentSvgKeys.value.includes(String(key || '').trim())

onMounted(() => {
    loadCategorySvgLibrary()
})
</script>

<style scoped>
.svg-library-page__header {
    margin-bottom: 16px;
}

.svg-library-page__title {
    margin: 0 0 6px;
    font-size: 18px;
    font-weight: 600;
    color: #303133;
}

.svg-library-page__desc {
    margin: 0;
    color: #606266;
    font-size: 13px;
    line-height: 1.6;
}

.svg-library-page__recommend {
    margin-top: 10px;
    font-size: 13px;
    color: #606266;
    line-height: 1.6;
}

.svg-library-page__recommend-label {
    color: #909399;
    margin-right: 6px;
}

.svg-library-page__alert {
    margin-bottom: 16px;
}

.svg-library-page__toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
    flex-wrap: wrap;
}

.svg-library-page__toolbar-tip {
    color: #909399;
    font-size: 12px;
}

.svg-library-page__tabs {
    margin-top: 10px;
}

.svg-library-page__json-wrap {
    width: 100%;
}

.svg-library-page__paste-wrap {
    width: 100%;
}

.svg-library-page__paste-head {
    width: 100%;
    display: grid;
    grid-template-columns: minmax(200px, 1fr) minmax(200px, 1fr) auto;
    gap: 10px;
    margin-bottom: 10px;
}

.svg-library-page__paste-tip {
    margin: 8px 0 0;
    color: #909399;
    font-size: 12px;
    line-height: 1.5;
}

.svg-library-page__error {
    margin-top: 6px;
    color: var(--el-color-danger);
    font-size: 12px;
}

.svg-library-page__upload-toolbar {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 14px;
    flex-wrap: wrap;
}

.svg-library-page__upload-form {
    padding-right: 8px;
}

.svg-library-page__preview {
    width: 100%;
    display: grid;
    gap: 12px;
}

.svg-library-page__preview-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
}

.svg-library-page__preview-summary {
    color: #303133;
    font-size: 13px;
    font-weight: 600;
}

.svg-library-page__preview-summary-sub {
    color: #909399;
    font-weight: 400;
}

.svg-library-page__preview-filter {
    display: inline-grid;
    grid-template-columns: minmax(180px, 240px) auto;
    gap: 10px;
    align-items: center;
}

.svg-library-page__preview-grid {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 10px;
}

.svg-library-page__preview-item {
    display: grid;
    grid-template-columns: 46px minmax(0, 1fr);
    grid-template-areas:
        "icon meta"
        "icon actions";
    align-items: center;
    gap: 8px 10px;
    border: 1px solid #ebeef5;
    border-radius: 8px;
    padding: 10px;
    background: #fff;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.svg-library-page__preview-item:hover {
    border-color: #c6e2ff;
    box-shadow: 0 2px 10px rgba(64, 158, 255, 0.12);
}

.svg-library-page__preview-item.is-recent {
    border-color: #95d475;
    box-shadow: 0 2px 8px rgba(103, 194, 58, 0.14);
}

.svg-library-page__preview-icon-wrap {
    grid-area: icon;
    width: 38px;
    height: 38px;
    border-radius: 8px;
    border: 1px solid #ebeef5;
    background: #f8fafc;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.svg-library-page__preview-icon {
    width: 28px;
    height: 28px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.svg-library-page__preview-icon :deep(svg) {
    width: 100%;
    height: 100%;
    display: block;
}

.svg-library-page__preview-meta {
    grid-area: meta;
    min-width: 0;
}

.svg-library-page__preview-label {
    font-size: 13px;
    color: #303133;
    font-weight: 500;
}

.svg-library-page__preview-key {
    font-size: 12px;
    color: #909399;
    margin-top: 2px;
}

.svg-library-page__preview-empty {
    display: block;
    font-size: 12px;
    color: #909399;
    padding: 12px 4px;
}

.svg-library-page__preview-actions {
    grid-area: actions;
    display: inline-flex;
    align-items: center;
    gap: 2px;
    flex-wrap: wrap;
}

@media (max-width: 980px) {
    .svg-library-page__paste-head {
        grid-template-columns: 1fr;
    }

    .svg-library-page__preview-filter {
        width: 100%;
        grid-template-columns: 1fr;
    }
}
</style>
