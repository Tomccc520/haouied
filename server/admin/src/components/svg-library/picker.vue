<!--
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-05
 */
-->
<template>
    <div class="svg-library-picker">
        <el-popover
            trigger="click"
            v-model:visible="popoverVisible"
            :width="popoverWidth"
            placement="bottom-start"
        >
            <div class="svg-library-picker__panel">
                <div class="svg-library-picker__toolbar">
                    <el-input
                        v-model.trim="keyword"
                        clearable
                        placeholder="搜索图标（名称 / key）"
                        class="svg-library-picker__search"
                    />
                    <span class="svg-library-picker__count">{{ filteredOptions.length }} / {{ normalizedOptions.length }}</span>
                </div>
                <div class="svg-library-picker__list-wrap">
                    <el-scrollbar height="280px">
                        <div v-if="filteredOptions.length === 0" class="svg-library-picker__empty">
                            未找到匹配图标
                        </div>
                        <div v-else class="svg-library-picker__list">
                            <button
                                v-for="item in filteredOptions"
                                :key="item.key"
                                type="button"
                                class="svg-library-picker__item"
                                :class="{ 'is-active': selectedOption?.key === item.key }"
                                @click="handleSelect(item.key)"
                            >
                                <span
                                    class="svg-library-picker__item-icon"
                                    aria-hidden="true"
                                    v-html="item.svg"
                                />
                                <span class="svg-library-picker__item-meta">
                                    <span class="svg-library-picker__item-label">{{ item.label }}</span>
                                    <span class="svg-library-picker__item-key">svg:{{ item.key }}</span>
                                </span>
                            </button>
                        </div>
                    </el-scrollbar>
                </div>
            </div>

            <template #reference>
                <el-input
                    ref="inputRef"
                    :model-value="displayText"
                    readonly
                    clearable
                    :disabled="disabled"
                    placeholder="点击选择图标库图标"
                    @click="openPopover"
                    @clear="handleClear"
                >
                    <template #prepend>
                        <span v-if="selectedOption" class="svg-library-picker__selected-icon" v-html="selectedOption.svg" />
                        <span v-else class="svg-library-picker__selected-empty">无</span>
                    </template>
                    <template #append>
                        <icon name="el-icon-ArrowDown" :size="14" />
                    </template>
                </el-input>
            </template>
        </el-popover>
    </div>
</template>

<script lang="ts" setup>
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-05
 */
import { computed, nextTick, ref, shallowRef, watch } from 'vue'
import type { ElInput } from 'element-plus'

interface SvgLibraryItem {
    key: string
    label: string
    svg: string
}

interface Props {
    modelValue: string
    options: SvgLibraryItem[]
    disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
    modelValue: '',
    options: () => [],
    disabled: false
})

const emits = defineEmits<{
    (e: 'update:modelValue', value: string): void
    (e: 'change', value: string): void
}>()

const popoverVisible = ref(false)
const popoverWidth = ref(420)
const keyword = ref('')
const inputRef = shallowRef<InstanceType<typeof ElInput>>()

/**
 * 规范化 svg:key 令牌，兼容传入 svg:key 或纯 key。
 */
const normalizeSvgTokenKey = (value: unknown): string => {
    const raw = String(value || '').trim().toLowerCase()
    const key = raw.startsWith('svg:') ? raw.slice(4) : raw
    return key.replace(/[^a-z0-9_-]/g, '').slice(0, 40)
}

/**
 * 清洗 SVG 预览内容，避免脚本或事件属性执行。
 */
const sanitizeSvgPreviewMarkup = (value: unknown): string => {
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
 * 规范化图标库选项，确保 key/label/svg 都可用于弹层渲染。
 */
const normalizedOptions = computed<SvgLibraryItem[]>(() =>
    (props.options || [])
        .map((item) => {
            const key = normalizeSvgTokenKey(item?.key)
            if (!key) return null
            const svg = sanitizeSvgPreviewMarkup(item?.svg)
            if (!svg) return null
            const label = String(item?.label || key).trim() || key
            return { key, label, svg }
        })
        .filter((item): item is SvgLibraryItem => Boolean(item))
)

const selectedKey = computed(() => normalizeSvgTokenKey(props.modelValue))

const selectedOption = computed(() =>
    normalizedOptions.value.find((item) => item.key === selectedKey.value) || null
)

const displayText = computed(() =>
    selectedOption.value ? `${selectedOption.value.label}（svg:${selectedOption.value.key}）` : ''
)

const filteredOptions = computed(() => {
    const searchKeyword = String(keyword.value || '').trim().toLowerCase()
    if (!searchKeyword) return normalizedOptions.value
    return normalizedOptions.value.filter((item) => {
        return (
            String(item.label || '').toLowerCase().includes(searchKeyword) ||
            String(item.key || '').toLowerCase().includes(searchKeyword)
        )
    })
})

/**
 * 根据输入框宽度同步弹层宽度，保证选择器布局稳定。
 */
const updatePopoverWidth = async () => {
    await nextTick()
    const width = Number(inputRef.value?.$el?.offsetWidth || 0)
    popoverWidth.value = Math.max(420, width)
}

/**
 * 打开图标选择弹层，并刷新弹层宽度。
 */
const openPopover = async () => {
    if (props.disabled) return
    popoverVisible.value = true
    await updatePopoverWidth()
}

/**
 * 选择图标后回写 svg:key，并关闭弹层。
 */
const handleSelect = (key: string) => {
    const token = `svg:${normalizeSvgTokenKey(key)}`
    emits('update:modelValue', token)
    emits('change', token)
    popoverVisible.value = false
}

/**
 * 清空当前图标选择。
 */
const handleClear = () => {
    emits('update:modelValue', '')
    emits('change', '')
}

watch(
    () => popoverVisible.value,
    async (visible) => {
        if (!visible) return
        await updatePopoverWidth()
    }
)
</script>

<style scoped>
.svg-library-picker {
    width: 100%;
}

.svg-library-picker :deep(.el-input-group) {
    width: 100%;
}

.svg-library-picker__panel {
    display: grid;
    gap: 10px;
}

.svg-library-picker__toolbar {
    display: flex;
    align-items: center;
    gap: 10px;
}

.svg-library-picker__search {
    flex: 1;
}

.svg-library-picker__count {
    color: var(--el-text-color-secondary);
    font-size: 12px;
    white-space: nowrap;
}

.svg-library-picker__list-wrap {
    border: 1px solid var(--el-border-color-light);
    border-radius: 8px;
    padding: 8px;
}

.svg-library-picker__list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 8px;
}

.svg-library-picker__item {
    border: 1px solid var(--el-border-color-light);
    border-radius: 8px;
    background: #fff;
    padding: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
    text-align: left;
    cursor: pointer;
}

.svg-library-picker__item:hover {
    border-color: var(--el-color-primary-light-5);
}

.svg-library-picker__item.is-active {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
}

.svg-library-picker__item-icon {
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.svg-library-picker__item-icon :deep(svg) {
    width: 100%;
    height: 100%;
    display: block;
}

.svg-library-picker__item-meta {
    min-width: 0;
    display: grid;
}

.svg-library-picker__item-label {
    font-size: 12px;
    color: var(--el-text-color-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.svg-library-picker__item-key {
    font-size: 11px;
    color: var(--el-text-color-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.svg-library-picker__selected-icon {
    width: 18px;
    height: 18px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.svg-library-picker__selected-icon :deep(svg) {
    width: 100%;
    height: 100%;
    display: block;
}

.svg-library-picker__selected-empty {
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

.svg-library-picker__empty {
    color: var(--el-text-color-secondary);
    font-size: 12px;
    text-align: center;
    padding: 20px 0;
}
</style>
