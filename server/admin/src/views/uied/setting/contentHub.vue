<!--
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-05
 */
-->
<template>
    <div class="content-hub-setting">
        <el-card shadow="never" class="content-hub-setting__card">
            <template #header>
                <div class="content-hub-setting__header">
                    <div>
                        <h2>内容中心统一配置</h2>
                        <p>热门文章 / 榜单系统 / 每日热榜 / 最新上新 已合并到一个菜单，前台统一使用 <code>/p/hot</code> 单页切换。</p>
                    </div>
                </div>
            </template>

            <el-tabs v-model="activeTab" class="content-hub-setting__tabs">
                <el-tab-pane label="热门文章" name="hot" lazy>
                    <HotArticlesSetting />
                </el-tab-pane>
                <el-tab-pane label="榜单系统" name="rankings" lazy>
                    <RankBoardSetting />
                </el-tab-pane>
                <el-tab-pane label="每日热榜" name="dailyHot" lazy>
                    <DailyHotSetting />
                </el-tab-pane>
                <el-tab-pane label="最新上新" name="dailyNew" lazy>
                    <el-card shadow="never">
                        <template #header>
                            <div class="content-hub-setting__daily-new-head">
                                <span>最新上新入口与页面文案</span>
                                <div class="content-hub-setting__daily-new-actions">
                                    <el-button :loading="dailyNewLoading" @click="loadDailyNewConfig">刷新</el-button>
                                    <el-button type="primary" :loading="dailyNewSaving" @click="saveDailyNewConfig">保存配置</el-button>
                                </div>
                            </div>
                        </template>
                        <el-form :model="dailyNewForm" label-width="150px">
                            <el-form-item label="启用最新上新">
                                <el-switch v-model="dailyNewForm.enabled" />
                            </el-form-item>
                            <el-form-item label="入口文案">
                                <el-input v-model="dailyNewForm.displayLabel" :disabled="!dailyNewForm.enabled" />
                            </el-form-item>
                            <el-form-item label="入口路径">
                                <el-input
                                    v-model="dailyNewForm.displayPath"
                                    :disabled="!dailyNewForm.enabled"
                                    placeholder="/p/hot?tab=daily-new"
                                />
                            </el-form-item>
                            <el-form-item label="显示位置">
                                <el-checkbox-group v-model="dailyNewForm.displayPlacements" :disabled="!dailyNewForm.enabled">
                                    <el-checkbox label="nav_quick_entry">首页快捷入口</el-checkbox>
                                    <el-checkbox label="home_menu">顶部导航菜单</el-checkbox>
                                    <el-checkbox label="footer_link">页脚链接</el-checkbox>
                                </el-checkbox-group>
                            </el-form-item>
                            <el-form-item label="入口排序">
                                <el-input-number v-model="dailyNewForm.displaySort" :min="1" :max="9999" :disabled="!dailyNewForm.enabled" />
                            </el-form-item>
                            <el-form-item label="新窗口打开">
                                <el-switch v-model="dailyNewForm.displayOpenInNewTab" :disabled="!dailyNewForm.enabled" />
                            </el-form-item>
                            <el-form-item label="默认天数">
                                <el-input-number v-model="dailyNewForm.defaultDays" :min="1" :max="30" :disabled="!dailyNewForm.enabled" />
                            </el-form-item>
                            <el-form-item label="页面角标">
                                <el-input v-model="dailyNewForm.pageKicker" :disabled="!dailyNewForm.enabled" />
                            </el-form-item>
                            <el-form-item label="页面标题">
                                <el-input v-model="dailyNewForm.pageTitle" :disabled="!dailyNewForm.enabled" />
                            </el-form-item>
                            <el-form-item label="页面描述">
                                <el-input
                                    v-model="dailyNewForm.pageDescription"
                                    type="textarea"
                                    :rows="3"
                                    :disabled="!dailyNewForm.enabled"
                                />
                            </el-form-item>
                        </el-form>
                    </el-card>
                </el-tab-pane>
            </el-tabs>
        </el-card>
    </div>
</template>

<script lang="ts" setup>
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-05
 */
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import feedback from '@/utils/feedback'
import { uiedSettingGet, uiedSettingSave } from '@/api/uied'
import HotArticlesSetting from './hotArticles.vue'
import DailyHotSetting from '../dailyHot/index.vue'
import RankBoardSetting from '../rankBoard/index.vue'

type ContentHubTab = 'hot' | 'rankings' | 'dailyHot' | 'dailyNew'

interface DailyNewFormState {
    enabled: boolean
    displayLabel: string
    displayPath: string
    displayPlacements: string[]
    displaySort: number
    displayOpenInNewTab: boolean
    defaultDays: number
    pageKicker: string
    pageTitle: string
    pageDescription: string
}

const route = useRoute()
const activeTab = ref<ContentHubTab>('hot')
const dailyNewLoading = ref(false)
const dailyNewSaving = ref(false)
const homepageConfigRaw = ref<Record<string, any>>({})

const dailyNewForm = reactive<DailyNewFormState>({
    enabled: true,
    displayLabel: '每日上新',
    displayPath: '/p/hot?tab=daily-new',
    displayPlacements: [ 'nav_quick_entry' ],
    displaySort: 86,
    displayOpenInNewTab: false,
    defaultDays: 7,
    pageKicker: 'Daily Fresh',
    pageTitle: '每日上新网址',
    pageDescription: '每天自动汇总最新收录站点，帮助运营和用户第一时间发现高质量新资源。',
})

/**
 * 规范化标签名，确保路由 query 与 tab 值一致。
 */
const normalizeTab = (value: unknown): ContentHubTab => {
    const text = String(value || '').trim()
    if (text === 'dailyHot') return 'dailyHot'
    if (text === 'rankings') return 'rankings'
    if (text === 'dailyNew') return 'dailyNew'
    return 'hot'
}

/**
 * 把页面配置中的“最新上新”字段回填到表单。
 */
const applyDailyNewForm = (config: Record<string, any>) => {
    const placements = Array.isArray(config?.dailyNewDisplayPlacements)
        ? config.dailyNewDisplayPlacements.map((item: unknown) => String(item || '').trim()).filter(Boolean)
        : []
    dailyNewForm.enabled = config?.dailyNewEnabled !== false
    dailyNewForm.displayLabel = String(config?.dailyNewDisplayLabel || '每日上新').trim() || '每日上新'
    dailyNewForm.displayPath = String(config?.dailyNewDisplayPath || '/p/hot?tab=daily-new').trim() || '/p/hot?tab=daily-new'
    dailyNewForm.displayPlacements = placements.length > 0 ? [ ...new Set(placements) ] : [ 'nav_quick_entry' ]
    dailyNewForm.displaySort = Number.isFinite(Number(config?.dailyNewDisplaySort))
        ? Math.max(1, Math.min(9999, Number(config.dailyNewDisplaySort)))
        : 86
    dailyNewForm.displayOpenInNewTab = config?.dailyNewDisplayOpenInNewTab === true
    dailyNewForm.defaultDays = Number.isFinite(Number(config?.dailyNewDefaultDays))
        ? Math.max(1, Math.min(30, Number(config.dailyNewDefaultDays)))
        : 7
    dailyNewForm.pageKicker = String(config?.dailyNewPageKicker || 'Daily Fresh').trim() || 'Daily Fresh'
    dailyNewForm.pageTitle = String(config?.dailyNewPageTitle || '每日上新网址').trim() || '每日上新网址'
    dailyNewForm.pageDescription = String(
        config?.dailyNewPageDescription || '每天自动汇总最新收录站点，帮助运营和用户第一时间发现高质量新资源。'
    ).trim() || '每天自动汇总最新收录站点，帮助运营和用户第一时间发现高质量新资源。'
}

/**
 * 加载“最新上新”配置，来源 homepageConfig。
 */
const loadDailyNewConfig = async () => {
    dailyNewLoading.value = true
    try {
        const data = await uiedSettingGet({ key: 'homepageConfig' })
        const config = data && typeof data === 'object' ? data : {}
        homepageConfigRaw.value = config as Record<string, any>
        applyDailyNewForm(config as Record<string, any>)
    } catch (error) {
        console.error('加载最新上新配置失败:', error)
        feedback.msgError('加载最新上新配置失败')
    } finally {
        dailyNewLoading.value = false
    }
}

/**
 * 保存“最新上新”配置（仅回写 homepageConfig 中对应字段，避免覆盖其他设置）。
 */
const saveDailyNewConfig = async () => {
    dailyNewSaving.value = true
    try {
        const merged = {
            ...(homepageConfigRaw.value || {}),
            dailyNewEnabled: dailyNewForm.enabled,
            dailyNewDisplayLabel: String(dailyNewForm.displayLabel || '').trim() || '每日上新',
            dailyNewDisplayPath: String(dailyNewForm.displayPath || '').trim() || '/p/hot?tab=daily-new',
            dailyNewDisplayPlacements: Array.from(
                new Set((dailyNewForm.displayPlacements || []).map((item) => String(item || '').trim()).filter(Boolean))
            ),
            dailyNewDisplaySort: Math.max(1, Math.min(9999, Number(dailyNewForm.displaySort || 86))),
            dailyNewDisplayOpenInNewTab: dailyNewForm.displayOpenInNewTab === true,
            dailyNewDefaultDays: Math.max(1, Math.min(30, Number(dailyNewForm.defaultDays || 7))),
            dailyNewPageKicker: String(dailyNewForm.pageKicker || '').trim() || 'Daily Fresh',
            dailyNewPageTitle: String(dailyNewForm.pageTitle || '').trim() || '每日上新网址',
            dailyNewPageDescription: String(dailyNewForm.pageDescription || '').trim()
                || '每天自动汇总最新收录站点，帮助运营和用户第一时间发现高质量新资源。',
        }
        await uiedSettingSave({ homepageConfig: merged })
        homepageConfigRaw.value = merged
        feedback.msgSuccess('最新上新配置保存成功')
    } catch (error) {
        console.error('保存最新上新配置失败:', error)
        feedback.msgError('保存最新上新配置失败')
    } finally {
        dailyNewSaving.value = false
    }
}

watch(
    () => route.query.tab,
    (value) => {
        activeTab.value = normalizeTab(value)
    },
    { immediate: true }
)

watch(
    () => activeTab.value,
    (value) => {
        if (value === 'dailyNew' && !dailyNewLoading.value && !Object.keys(homepageConfigRaw.value || {}).length) {
            loadDailyNewConfig()
        }
    },
    { immediate: true }
)

onMounted(() => {
    if (activeTab.value === 'dailyNew') {
        loadDailyNewConfig()
    }
})
</script>

<style scoped>
.content-hub-setting {
    padding: 10px;
}

.content-hub-setting__card {
    border-radius: 12px;
}

.content-hub-setting__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
}

.content-hub-setting__header h2 {
    margin: 0;
    font-size: 20px;
    color: #1f2937;
}

.content-hub-setting__header p {
    margin: 6px 0 0;
    color: #6b7280;
    font-size: 13px;
    line-height: 1.6;
}

.content-hub-setting__tabs {
    margin-top: 4px;
}

.content-hub-setting__daily-new-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.content-hub-setting__daily-new-actions {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}
</style>
