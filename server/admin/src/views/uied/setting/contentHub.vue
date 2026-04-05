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
                        <p>热门文章 / 榜单系统 / 每日热榜 / 最新上新 / 网站对比 已合并到一个菜单，前台统一配置驱动展示。</p>
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
                <el-tab-pane label="网站对比" name="websiteCompare" lazy>
                    <el-card shadow="never">
                        <template #header>
                            <div class="content-hub-setting__daily-new-head">
                                <span>网站对比页配置（/vs/*）</span>
                                <div class="content-hub-setting__daily-new-actions">
                                    <el-button :loading="websiteCompareLoading" @click="loadWebsiteCompareConfig">刷新</el-button>
                                    <el-button :loading="websiteCompareSaving" @click="resetWebsiteCompareToDefault">恢复默认</el-button>
                                    <el-button type="primary" :loading="websiteCompareSaving" @click="saveWebsiteCompareConfig">保存配置</el-button>
                                </div>
                            </div>
                        </template>

                        <el-form :model="websiteCompareForm" label-width="160px">
                            <el-divider content-position="left">区块开关</el-divider>
                            <el-form-item label="核心差异表">
                                <el-switch v-model="websiteCompareForm.sections.coreDiff" />
                            </el-form-item>
                            <el-form-item label="优缺点建议">
                                <el-switch v-model="websiteCompareForm.sections.guide" />
                            </el-form-item>
                            <el-form-item label="FAQ区块">
                                <el-switch v-model="websiteCompareForm.sections.faq" />
                            </el-form-item>
                            <el-form-item label="内链推荐">
                                <el-switch v-model="websiteCompareForm.sections.internalLinks" />
                            </el-form-item>
                            <el-form-item label="AI分析区">
                                <el-switch v-model="websiteCompareForm.sections.aiAnalysis" />
                            </el-form-item>

                            <el-divider content-position="left">文案模板</el-divider>
                            <el-form-item label="H1标题模板">
                                <el-input v-model="websiteCompareForm.copywriting.heroTitleTemplate" placeholder="支持 {left} / {right}" />
                            </el-form-item>
                            <el-form-item label="描述模板">
                                <el-input v-model="websiteCompareForm.copywriting.heroDescriptionTemplate" type="textarea" :rows="2" />
                            </el-form-item>
                            <el-form-item label="差异表标题">
                                <el-input v-model="websiteCompareForm.copywriting.coreDiffTitle" />
                            </el-form-item>
                            <el-form-item label="建议区标题">
                                <el-input v-model="websiteCompareForm.copywriting.guideTitle" />
                            </el-form-item>
                            <el-form-item label="建议区说明">
                                <el-input v-model="websiteCompareForm.copywriting.guideDescription" type="textarea" :rows="2" />
                            </el-form-item>
                            <el-form-item label="优点模板">
                                <el-input
                                    v-model="websiteCompareForm.copywriting.strengthTemplates"
                                    type="textarea"
                                    :rows="4"
                                    placeholder="每行一条，支持 {website} / {category} / {top_tags}"
                                />
                            </el-form-item>
                            <el-form-item label="注意点模板">
                                <el-input
                                    v-model="websiteCompareForm.copywriting.cautionTemplates"
                                    type="textarea"
                                    :rows="4"
                                    placeholder="每行一条，支持 {website} / {category} / {top_tags}"
                                />
                            </el-form-item>
                            <el-form-item label="适用人群模板">
                                <el-input
                                    v-model="websiteCompareForm.copywriting.audienceTemplates"
                                    type="textarea"
                                    :rows="3"
                                    placeholder="每行一条，支持 {website} / {category} / {top_tags}"
                                />
                            </el-form-item>
                            <el-form-item label="势均力敌建议">
                                <el-input
                                    v-model="websiteCompareForm.copywriting.recommendationTieTemplate"
                                    type="textarea"
                                    :rows="2"
                                    placeholder="支持 {left} / {right}"
                                />
                            </el-form-item>
                            <el-form-item label="领先建议模板">
                                <el-input
                                    v-model="websiteCompareForm.copywriting.recommendationLeadTemplate"
                                    type="textarea"
                                    :rows="2"
                                    placeholder="支持 {winner} / {loser}"
                                />
                            </el-form-item>
                            <el-form-item label="FAQ标题">
                                <el-input v-model="websiteCompareForm.copywriting.faqTitle" />
                            </el-form-item>
                            <el-form-item label="内链标题">
                                <el-input v-model="websiteCompareForm.copywriting.internalLinksTitle" />
                            </el-form-item>
                            <el-form-item label="内链说明">
                                <el-input v-model="websiteCompareForm.copywriting.internalLinksDescription" type="textarea" :rows="2" />
                            </el-form-item>
                            <el-form-item label="AI区标题">
                                <el-input v-model="websiteCompareForm.copywriting.aiAnalysisTitle" />
                            </el-form-item>
                            <el-form-item label="AI区说明">
                                <el-input v-model="websiteCompareForm.copywriting.aiAnalysisDescription" type="textarea" :rows="2" />
                            </el-form-item>

                            <el-divider content-position="left">对比指标</el-divider>
                            <el-table :data="websiteCompareForm.metrics" size="small" border>
                                <el-table-column label="启用" width="80" align="center">
                                    <template #default="{ row }">
                                        <el-switch v-model="row.enabled" />
                                    </template>
                                </el-table-column>
                                <el-table-column label="字段Key" prop="key" min-width="140" />
                                <el-table-column label="展示名称" min-width="200">
                                    <template #default="{ row }">
                                        <el-input v-model="row.label" />
                                    </template>
                                </el-table-column>
                                <el-table-column label="排序" width="120">
                                    <template #default="{ row }">
                                        <el-input-number v-model="row.sort" :min="1" :max="9999" />
                                    </template>
                                </el-table-column>
                            </el-table>

                            <el-divider content-position="left">FAQ配置</el-divider>
                            <div class="content-hub-setting__faq-actions">
                                <el-button type="primary" plain @click="addWebsiteCompareFaq">新增FAQ</el-button>
                            </div>
                            <div
                                v-for="(faq, index) in websiteCompareForm.faqItems"
                                :key="`faq-${index}`"
                                class="content-hub-setting__faq-item"
                            >
                                <div class="content-hub-setting__faq-item-header">
                                    <span>FAQ #{{ index + 1 }}</span>
                                    <div class="content-hub-setting__faq-item-actions">
                                        <el-switch v-model="faq.enabled" active-text="启用" inactive-text="停用" />
                                        <el-button type="danger" link @click="removeWebsiteCompareFaq(index)">删除</el-button>
                                    </div>
                                </div>
                                <el-form-item label="问题">
                                    <el-input v-model="faq.question" placeholder="支持 {left} / {right}" />
                                </el-form-item>
                                <el-form-item label="答案">
                                    <el-input v-model="faq.answer" type="textarea" :rows="3" />
                                </el-form-item>
                                <el-form-item label="排序">
                                    <el-input-number v-model="faq.sort" :min="1" :max="9999" />
                                </el-form-item>
                            </div>
                        </el-form>
                    </el-card>
                </el-tab-pane>
                <el-tab-pane label="MCP中心" name="mcp" lazy>
                    <el-card shadow="never">
                        <template #header>
                            <div class="content-hub-setting__daily-new-head">
                                <span>MCP 前端页面样式配置（/mcp）</span>
                                <div class="content-hub-setting__daily-new-actions">
                                    <el-button :loading="mcpPageLoading" @click="loadMcpPageConfig">刷新</el-button>
                                    <el-button type="primary" :loading="mcpPageSaving" @click="saveMcpPageConfig">保存配置</el-button>
                                </div>
                            </div>
                        </template>
                        <el-form :model="mcpPageForm" label-width="160px">
                            <el-form-item label="启用MCP页面">
                                <el-switch v-model="mcpPageForm.enabled" />
                            </el-form-item>
                            <el-form-item label="展示Hero区">
                                <el-switch v-model="mcpPageForm.heroEnabled" :disabled="!mcpPageForm.enabled" />
                            </el-form-item>
                            <el-form-item label="Hero风格">
                                <el-radio-group v-model="mcpPageForm.heroStyle" :disabled="!mcpPageForm.enabled">
                                    <el-radio-button label="glass">玻璃感</el-radio-button>
                                    <el-radio-button label="solid">纯色块</el-radio-button>
                                </el-radio-group>
                            </el-form-item>
                            <el-form-item label="视觉预设">
                                <el-radio-group v-model="mcpPageForm.visualPreset" :disabled="!mcpPageForm.enabled">
                                    <el-radio-button label="minimal">极简线框</el-radio-button>
                                    <el-radio-button label="tech">科技渐变</el-radio-button>
                                </el-radio-group>
                            </el-form-item>
                            <el-form-item label="背景模式">
                                <el-radio-group v-model="mcpPageForm.backgroundMode" :disabled="!mcpPageForm.enabled">
                                    <el-radio-button label="plain">纯色</el-radio-button>
                                    <el-radio-button label="mesh">柔和渐变</el-radio-button>
                                    <el-radio-button label="grid">网格纹理</el-radio-button>
                                </el-radio-group>
                            </el-form-item>
                            <el-form-item label="主题色">
                                <div class="content-hub-setting__color-field">
                                    <el-color-picker v-model="mcpPageForm.accentColor" :disabled="!mcpPageForm.enabled" />
                                    <el-input v-model="mcpPageForm.accentColor" :disabled="!mcpPageForm.enabled" maxlength="7" />
                                </div>
                            </el-form-item>
                            <el-form-item label="页面底色">
                                <div class="content-hub-setting__color-field">
                                    <el-color-picker v-model="mcpPageForm.pageBackgroundColor" :disabled="!mcpPageForm.enabled" />
                                    <el-input v-model="mcpPageForm.pageBackgroundColor" :disabled="!mcpPageForm.enabled" maxlength="7" />
                                </div>
                            </el-form-item>
                            <el-form-item label="Hero底色">
                                <div class="content-hub-setting__color-field">
                                    <el-color-picker v-model="mcpPageForm.heroBackgroundColor" :disabled="!mcpPageForm.enabled" />
                                    <el-input v-model="mcpPageForm.heroBackgroundColor" :disabled="!mcpPageForm.enabled" maxlength="7" />
                                </div>
                            </el-form-item>
                            <el-form-item label="Hero头图URL">
                                <el-input
                                    v-model="mcpPageForm.heroCoverImage"
                                    :disabled="!mcpPageForm.enabled"
                                    placeholder="可填素材中心图片 URL，留空则使用渐变背景"
                                />
                            </el-form-item>
                            <el-form-item label="页面角标">
                                <el-input v-model="mcpPageForm.pageKicker" :disabled="!mcpPageForm.enabled" maxlength="40" show-word-limit />
                            </el-form-item>
                            <el-form-item label="页面标题">
                                <el-input v-model="mcpPageForm.pageTitle" :disabled="!mcpPageForm.enabled" maxlength="80" show-word-limit />
                            </el-form-item>
                            <el-form-item label="页面描述">
                                <el-input
                                    v-model="mcpPageForm.pageDescription"
                                    type="textarea"
                                    :rows="3"
                                    :disabled="!mcpPageForm.enabled"
                                    maxlength="240"
                                    show-word-limit
                                />
                            </el-form-item>
                            <el-form-item label="显示收录统计">
                                <el-switch v-model="mcpPageForm.showHeroStats" :disabled="!mcpPageForm.enabled || !mcpPageForm.heroEnabled" />
                            </el-form-item>
                            <el-form-item label="卡片风格">
                                <el-radio-group v-model="mcpPageForm.cardStyle" :disabled="!mcpPageForm.enabled">
                                    <el-radio-button label="elevated">浮层卡片</el-radio-button>
                                    <el-radio-button label="outline">描边卡片</el-radio-button>
                                </el-radio-group>
                            </el-form-item>
                            <el-form-item label="信息密度">
                                <el-radio-group v-model="mcpPageForm.density" :disabled="!mcpPageForm.enabled">
                                    <el-radio-button label="comfortable">舒适</el-radio-button>
                                    <el-radio-button label="compact">紧凑</el-radio-button>
                                </el-radio-group>
                            </el-form-item>
                            <el-form-item label="卡片边框色">
                                <div class="content-hub-setting__color-field">
                                    <el-color-picker v-model="mcpPageForm.cardBorderColor" :disabled="!mcpPageForm.enabled" />
                                    <el-input v-model="mcpPageForm.cardBorderColor" :disabled="!mcpPageForm.enabled" maxlength="7" />
                                </div>
                            </el-form-item>
                            <el-form-item label="卡片圆角">
                                <el-input-number v-model="mcpPageForm.cardRadius" :min="10" :max="28" :disabled="!mcpPageForm.enabled" />
                            </el-form-item>
                            <el-form-item label="卡片阴影">
                                <el-switch v-model="mcpPageForm.cardShadowEnabled" :disabled="!mcpPageForm.enabled" />
                            </el-form-item>
                            <el-form-item label="显示官网按钮">
                                <el-switch v-model="mcpPageForm.showOfficialLink" :disabled="!mcpPageForm.enabled" />
                            </el-form-item>
                            <el-form-item label="显示标签筛选">
                                <el-switch v-model="mcpPageForm.showTagFilter" :disabled="!mcpPageForm.enabled" />
                            </el-form-item>
                            <el-form-item label="标签上限">
                                <el-input-number v-model="mcpPageForm.tagFilterLimit" :min="5" :max="60" :disabled="!mcpPageForm.enabled || !mcpPageForm.showTagFilter" />
                            </el-form-item>
                            <el-form-item label="显示分类数量">
                                <el-switch v-model="mcpPageForm.showCategoryCount" :disabled="!mcpPageForm.enabled" />
                            </el-form-item>
                            <el-form-item label="每页MCP卡片数">
                                <div class="content-hub-setting__inline-column">
                                    <el-input-number v-model="mcpPageForm.listPageSize" :min="6" :max="48" :disabled="!mcpPageForm.enabled" />
                                    <span class="content-hub-setting__tip">前端 /mcp 列表分页条数，建议 12-24。</span>
                                </div>
                            </el-form-item>
                            <el-form-item label="内容最大宽度">
                                <el-input-number v-model="mcpPageForm.maxWidth" :min="960" :max="1800" :step="20" :disabled="!mcpPageForm.enabled" />
                            </el-form-item>
                            <el-divider content-position="left">详情页头部样式</el-divider>
                            <el-form-item label="头部样式">
                                <el-radio-group v-model="mcpPageForm.detailHeaderStyle" :disabled="!mcpPageForm.enabled">
                                    <el-radio-button label="classic">经典版</el-radio-button>
                                    <el-radio-button label="market">市场版</el-radio-button>
                                </el-radio-group>
                            </el-form-item>
                            <el-form-item label="显示评分位">
                                <el-switch v-model="mcpPageForm.detailShowRating" :disabled="!mcpPageForm.enabled" />
                            </el-form-item>
                            <el-form-item label="默认评分值">
                                <el-input-number
                                    v-model="mcpPageForm.detailRatingValue"
                                    :min="0"
                                    :max="5"
                                    :step="0.1"
                                    :precision="1"
                                    :disabled="!mcpPageForm.enabled || !mcpPageForm.detailShowRating"
                                />
                            </el-form-item>
                            <el-form-item label="显示接入命令">
                                <el-switch v-model="mcpPageForm.detailShowCommand" :disabled="!mcpPageForm.enabled" />
                            </el-form-item>
                            <el-form-item label="命令模板">
                                <el-input
                                    v-model="mcpPageForm.detailCommandTemplate"
                                    :disabled="!mcpPageForm.enabled || !mcpPageForm.detailShowCommand"
                                    placeholder='可选占位符：{transport} {runtime} {official_url} {docs_url} {github_url} {slug}'
                                />
                            </el-form-item>
                            <el-form-item label="显示版本标签">
                                <el-switch v-model="mcpPageForm.detailShowVersionTag" :disabled="!mcpPageForm.enabled" />
                            </el-form-item>
                        </el-form>
                    </el-card>
                </el-tab-pane>
                <el-tab-pane label="Figma中心" name="figma" lazy>
                    <el-card shadow="never">
                        <template #header>
                            <div class="content-hub-setting__daily-new-head">
                                <span>Figma 前端页面配置（/figma）</span>
                                <div class="content-hub-setting__daily-new-actions">
                                    <el-button :loading="figmaPageLoading" @click="loadFigmaPageConfig">刷新</el-button>
                                    <el-button type="primary" :loading="figmaPageSaving" @click="saveFigmaPageConfig">保存配置</el-button>
                                </div>
                            </div>
                        </template>
                        <el-form :model="figmaPageForm" label-width="160px">
                            <el-form-item label="启用 Figma 页面">
                                <el-switch v-model="figmaPageForm.enabled" />
                            </el-form-item>
                            <el-form-item label="每页插件卡片数">
                                <div class="content-hub-setting__inline-column">
                                    <el-input-number v-model="figmaPageForm.listPageSize" :min="6" :max="72" :disabled="!figmaPageForm.enabled" />
                                    <span class="content-hub-setting__tip">控制 /figma 页列表分页条数，建议 18-30。</span>
                                </div>
                            </el-form-item>
                            <el-form-item label="卡片点击行为">
                                <el-radio-group v-model="figmaPageForm.cardClickAction" :disabled="!figmaPageForm.enabled">
                                    <el-radio-button label="official_first">优先原链接</el-radio-button>
                                    <el-radio-button label="detail">进入详情页</el-radio-button>
                                </el-radio-group>
                            </el-form-item>
                            <el-form-item label="新窗口打开">
                                <el-switch
                                    v-model="figmaPageForm.cardClickNewWindow"
                                    :disabled="!figmaPageForm.enabled || figmaPageForm.cardClickAction !== 'official_first'"
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

type ContentHubTab = 'hot' | 'rankings' | 'dailyHot' | 'dailyNew' | 'websiteCompare' | 'mcp' | 'figma'

type WebsiteCompareMetricKey =
    | 'category'
    | 'domain'
    | 'protocol'
    | 'tag_count'
    | 'screenshot_count'
    | 'comment_count'
    | 'rating_count'
    | 'updated_at'

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

interface WebsiteCompareMetricItem {
    key: WebsiteCompareMetricKey
    label: string
    enabled: boolean
    sort: number
}

interface WebsiteCompareFaqItem {
    question: string
    answer: string
    enabled: boolean
    sort: number
}

interface WebsiteCompareFormState {
    sections: {
        coreDiff: boolean
        guide: boolean
        faq: boolean
        internalLinks: boolean
        aiAnalysis: boolean
    }
    copywriting: {
        heroTitleTemplate: string
        heroDescriptionTemplate: string
        coreDiffTitle: string
        guideTitle: string
        guideDescription: string
        strengthTemplates: string
        cautionTemplates: string
        audienceTemplates: string
        recommendationTieTemplate: string
        recommendationLeadTemplate: string
        faqTitle: string
        internalLinksTitle: string
        internalLinksDescription: string
        aiAnalysisTitle: string
        aiAnalysisDescription: string
    }
    metrics: WebsiteCompareMetricItem[]
    faqItems: WebsiteCompareFaqItem[]
}

interface McpPageFormState {
    enabled: boolean
    heroEnabled: boolean
    heroStyle: 'glass' | 'solid'
    visualPreset: 'minimal' | 'tech'
    pageKicker: string
    pageTitle: string
    pageDescription: string
    showHeroStats: boolean
    cardStyle: 'elevated' | 'outline'
    density: 'compact' | 'comfortable'
    backgroundMode: 'plain' | 'mesh' | 'grid'
    accentColor: string
    pageBackgroundColor: string
    heroBackgroundColor: string
    heroCoverImage: string
    cardBorderColor: string
    cardRadius: number
    cardShadowEnabled: boolean
    showOfficialLink: boolean
    showTagFilter: boolean
    tagFilterLimit: number
    showCategoryCount: boolean
    listPageSize: number
    maxWidth: number
    detailHeaderStyle: 'classic' | 'market'
    detailShowRating: boolean
    detailRatingValue: number
    detailShowCommand: boolean
    detailCommandTemplate: string
    detailShowVersionTag: boolean
}

interface FigmaPageFormState {
    enabled: boolean
    listPageSize: number
    cardClickAction: 'detail' | 'official_first'
    cardClickNewWindow: boolean
}

const route = useRoute()
const activeTab = ref<ContentHubTab>('hot')
const dailyNewLoading = ref(false)
const dailyNewSaving = ref(false)
const homepageConfigRaw = ref<Record<string, any>>({})
const websiteCompareLoading = ref(false)
const websiteCompareSaving = ref(false)
const websiteCompareInited = ref(false)
const mcpPageLoading = ref(false)
const mcpPageSaving = ref(false)
const mcpPageInited = ref(false)
const figmaPageLoading = ref(false)
const figmaPageSaving = ref(false)
const figmaPageInited = ref(false)

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
 * 获取网站对比默认配置，确保恢复默认和首屏兜底一致。
 */
const getDefaultWebsiteCompareConfig = (): WebsiteCompareFormState => ({
    sections: {
        coreDiff: true,
        guide: true,
        faq: true,
        internalLinks: true,
        aiAnalysis: true,
    },
    copywriting: {
        heroTitleTemplate: '{left} 和 {right} 哪个好？有什么区别和优缺点？',
        heroDescriptionTemplate: '对比 {left} 和 {right} 的基础信息、分类、标签、截图与更新时间，帮助你更快判断哪个网站更适合你的使用场景。',
        coreDiffTitle: '核心差异对比',
        guideTitle: '优缺点速览与适用人群',
        guideDescription: '基于站点公开信息自动生成结构化建议，辅助快速决策。',
        strengthTemplates: [
            '{website} 的定位更偏向「{category}」场景，适合目标明确时快速筛选。',
            '从标签覆盖看，{website} 更接近 {top_tags} 等方向，功能边界相对清晰。',
            '如果你更关注 {top_tags} 这类需求，{website} 更值得优先试用。',
            '当前公开信息结构较完整，适合先纳入候选清单做进一步体验。',
        ].join('\n'),
        cautionTemplates: [
            '建议结合官网实际体验确认 {website} 的核心功能与上手门槛。',
            '如果你更看重深度文档或社区反馈，建议再补充外部资料验证。',
            '在最终选择前，最好把 {website} 与同类工具的价格、更新频率一起比较。',
            '若你的需求偏离「{category}」方向，建议再看一轮备选方案。',
        ].join('\n'),
        audienceTemplates: [
            '适合正在寻找「{category}」相关资源的用户。',
            '适合关注 {top_tags} 等方向的从业者或团队。',
            '如果你希望先快速筛一轮候选站点，{website} 适合作为首批试用对象。',
        ].join('\n'),
        recommendationTieTemplate: '两者公开信息量接近，建议优先根据具体功能场景和实际体验来决策。',
        recommendationLeadTemplate: '从当前收录信息完整度看，{winner} 的公开信息更丰富，适合先作为优先试用方案。',
        faqTitle: '常见问题',
        internalLinksTitle: '更多候选对比（内链）',
        internalLinksDescription: '基于分类与标签自动推荐，持续扩展对比页覆盖的长尾词。',
        aiAnalysisTitle: 'AI 分析对比（可选）',
        aiAnalysisDescription: '基于当前公开信息生成对比结论、适用人群与选择建议。',
    },
    metrics: [
        { key: 'category', label: '分类', enabled: true, sort: 10 },
        { key: 'domain', label: '域名', enabled: true, sort: 20 },
        { key: 'protocol', label: '协议', enabled: true, sort: 30 },
        { key: 'tag_count', label: '标签数量', enabled: true, sort: 40 },
        { key: 'screenshot_count', label: '截图数量', enabled: true, sort: 50 },
        { key: 'comment_count', label: '评论数', enabled: true, sort: 60 },
        { key: 'rating_count', label: '评分人数', enabled: true, sort: 70 },
        { key: 'updated_at', label: '最近更新', enabled: true, sort: 80 },
    ],
    faqItems: [
        {
            question: '{left} 和 {right} 哪个更适合新手？',
            answer: '建议先从功能定位、界面复杂度和你的使用目标来判断。',
            enabled: true,
            sort: 10,
        },
        {
            question: '{left} 和 {right} 的主要区别是什么？',
            answer: '通常差异体现在功能定位、内容风格、更新频率与使用门槛。',
            enabled: true,
            sort: 20,
        },
        {
            question: '怎么选择 {left} 或 {right}？',
            answer: '优先选择标签和分类更匹配的站点，再结合实际体验做最终决策。',
            enabled: true,
            sort: 30,
        },
    ],
})

const websiteCompareForm = reactive<WebsiteCompareFormState>(getDefaultWebsiteCompareConfig())

/**
 * 统一把模板数组转成多行文本，供后台 textarea 编辑。
 */
const normalizeTemplateTextarea = (value: unknown, fallback: string): string => {
    const rows = Array.isArray(value)
        ? value
        : String(value || '')
            .split(/\r?\n/)
            .map(item => String(item || '').trim())
            .filter(Boolean)
    return rows.length > 0 ? rows.join('\n') : fallback
}

/**
 * 把后台 textarea 文本转成模板数组，保存时统一写回结构化配置。
 */
const parseTemplateTextarea = (value: unknown, fallback: string[]): string[] => {
    const rows = String(value || '')
        .split(/\r?\n/)
        .map(item => String(item || '').trim())
        .filter(Boolean)
    return rows.length > 0 ? rows : fallback
}

/**
 * 获取 MCP 页面默认配置，和后端默认值保持一致。
 */
const getDefaultMcpPageConfig = (): McpPageFormState => ({
    enabled: true,
    heroEnabled: true,
    heroStyle: 'glass',
    visualPreset: 'minimal',
    pageKicker: 'MCP HUB',
    pageTitle: 'MCP 中心',
    pageDescription: '集中收录可直接部署与接入的 MCP 服务，支持按分类和标签快速筛选。',
    showHeroStats: true,
    cardStyle: 'elevated',
    density: 'comfortable',
    backgroundMode: 'mesh',
    accentColor: '#2563eb',
    pageBackgroundColor: '#f2f6ff',
    heroBackgroundColor: '#eef4ff',
    heroCoverImage: '',
    cardBorderColor: '#dbe4ff',
    cardRadius: 16,
    cardShadowEnabled: false,
    showOfficialLink: true,
    showTagFilter: true,
    tagFilterLimit: 20,
    showCategoryCount: true,
    listPageSize: 12,
    maxWidth: 1280,
    detailHeaderStyle: 'classic',
    detailShowRating: true,
    detailRatingValue: 0,
    detailShowCommand: true,
    detailCommandTemplate: '',
    detailShowVersionTag: true,
})

const mcpPageForm = reactive<McpPageFormState>(getDefaultMcpPageConfig())

/**
 * 获取 Figma 页面默认配置，和后端默认值保持一致。
 */
const getDefaultFigmaPageConfig = (): FigmaPageFormState => ({
    enabled: true,
    listPageSize: 24,
    cardClickAction: 'official_first',
    cardClickNewWindow: true,
})

const figmaPageForm = reactive<FigmaPageFormState>(getDefaultFigmaPageConfig())

/**
 * 规范化 HEX 色值，避免输入非法值导致前端样式异常。
 */
const normalizeHexColor = (value: unknown, fallback: string): string => {
    const text = String(value || '').trim()
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(text) ? text : fallback
}

/**
 * 规范化标签名，确保路由 query 与 tab 值一致。
 */
const normalizeTab = (value: unknown): ContentHubTab => {
    const text = String(value || '').trim()
    if (text === 'dailyHot') return 'dailyHot'
    if (text === 'rankings') return 'rankings'
    if (text === 'dailyNew') return 'dailyNew'
    if (text === 'websiteCompare') return 'websiteCompare'
    if (text === 'mcp') return 'mcp'
    if (text === 'figma') return 'figma'
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
 * 把网站对比配置回填到表单。
 */
const applyWebsiteCompareForm = (config: Record<string, any>) => {
    const defaults = getDefaultWebsiteCompareConfig()
    const sections = config?.sections && typeof config.sections === 'object' ? config.sections : {}
    const copywriting = config?.copywriting && typeof config.copywriting === 'object' ? config.copywriting : {}
    const rawMetrics = Array.isArray(config?.metrics) ? config.metrics : defaults.metrics
    const rawFaqItems = Array.isArray(config?.faqItems) ? config.faqItems : defaults.faqItems

    websiteCompareForm.sections.coreDiff = sections?.coreDiff !== false
    websiteCompareForm.sections.guide = sections?.guide !== false
    websiteCompareForm.sections.faq = sections?.faq !== false
    websiteCompareForm.sections.internalLinks = sections?.internalLinks !== false
    websiteCompareForm.sections.aiAnalysis = sections?.aiAnalysis !== false

    websiteCompareForm.copywriting.heroTitleTemplate = String(copywriting?.heroTitleTemplate || defaults.copywriting.heroTitleTemplate)
    websiteCompareForm.copywriting.heroDescriptionTemplate = String(copywriting?.heroDescriptionTemplate || defaults.copywriting.heroDescriptionTemplate)
    websiteCompareForm.copywriting.coreDiffTitle = String(copywriting?.coreDiffTitle || defaults.copywriting.coreDiffTitle)
    websiteCompareForm.copywriting.guideTitle = String(copywriting?.guideTitle || defaults.copywriting.guideTitle)
    websiteCompareForm.copywriting.guideDescription = String(copywriting?.guideDescription || defaults.copywriting.guideDescription)
    websiteCompareForm.copywriting.strengthTemplates = normalizeTemplateTextarea(
        copywriting?.strengthTemplates,
        defaults.copywriting.strengthTemplates
    )
    websiteCompareForm.copywriting.cautionTemplates = normalizeTemplateTextarea(
        copywriting?.cautionTemplates,
        defaults.copywriting.cautionTemplates
    )
    websiteCompareForm.copywriting.audienceTemplates = normalizeTemplateTextarea(
        copywriting?.audienceTemplates,
        defaults.copywriting.audienceTemplates
    )
    websiteCompareForm.copywriting.recommendationTieTemplate = String(
        copywriting?.recommendationTieTemplate || defaults.copywriting.recommendationTieTemplate
    )
    websiteCompareForm.copywriting.recommendationLeadTemplate = String(
        copywriting?.recommendationLeadTemplate || defaults.copywriting.recommendationLeadTemplate
    )
    websiteCompareForm.copywriting.faqTitle = String(copywriting?.faqTitle || defaults.copywriting.faqTitle)
    websiteCompareForm.copywriting.internalLinksTitle = String(copywriting?.internalLinksTitle || defaults.copywriting.internalLinksTitle)
    websiteCompareForm.copywriting.internalLinksDescription = String(copywriting?.internalLinksDescription || defaults.copywriting.internalLinksDescription)
    websiteCompareForm.copywriting.aiAnalysisTitle = String(copywriting?.aiAnalysisTitle || defaults.copywriting.aiAnalysisTitle)
    websiteCompareForm.copywriting.aiAnalysisDescription = String(copywriting?.aiAnalysisDescription || defaults.copywriting.aiAnalysisDescription)

    const metricKeys = new Set(defaults.metrics.map(item => item.key))
    const normalizedMetrics = rawMetrics
        .map((item: any, index: number) => {
            const key = String(item?.key || '').trim() as WebsiteCompareMetricKey
            if (!metricKeys.has(key)) return null
            return {
                key,
                label: String(item?.label || key),
                enabled: item?.enabled !== false,
                sort: Number.isFinite(Number(item?.sort)) ? Number(item.sort) : (index + 1) * 10,
            }
        })
        .filter((item: WebsiteCompareMetricItem | null): item is WebsiteCompareMetricItem => Boolean(item))
        .sort((a, b) => a.sort - b.sort)
    websiteCompareForm.metrics = normalizedMetrics.length > 0 ? normalizedMetrics : defaults.metrics

    const normalizedFaqItems = rawFaqItems
        .map((item: any, index: number) => ({
            question: String(item?.question || '').trim(),
            answer: String(item?.answer || '').trim(),
            enabled: item?.enabled !== false,
            sort: Number.isFinite(Number(item?.sort)) ? Number(item.sort) : (index + 1) * 10,
        }))
        .filter((item: WebsiteCompareFaqItem) => item.question && item.answer)
        .sort((a, b) => a.sort - b.sort)
    websiteCompareForm.faqItems = normalizedFaqItems.length > 0 ? normalizedFaqItems : defaults.faqItems
}

/**
 * 回填 MCP 页面配置表单。
 */
const applyMcpPageForm = (config: Record<string, any>) => {
    const defaults = getDefaultMcpPageConfig()
    const heroStyle = String(config?.heroStyle || '').trim().toLowerCase()
    const visualPreset = String(config?.visualPreset || '').trim().toLowerCase()
    const cardStyle = String(config?.cardStyle || '').trim().toLowerCase()
    const density = String(config?.density || '').trim().toLowerCase()
    const backgroundMode = String(config?.backgroundMode || '').trim().toLowerCase()
    const detailHeaderStyle = String(config?.detailHeaderStyle || '').trim().toLowerCase()
    mcpPageForm.enabled = config?.enabled !== false
    mcpPageForm.heroEnabled = config?.heroEnabled !== false
    mcpPageForm.heroStyle = heroStyle === 'solid' ? 'solid' : defaults.heroStyle
    mcpPageForm.visualPreset = visualPreset === 'tech' ? 'tech' : defaults.visualPreset
    mcpPageForm.pageKicker = String(config?.pageKicker || defaults.pageKicker).trim() || defaults.pageKicker
    mcpPageForm.pageTitle = String(config?.pageTitle || defaults.pageTitle).trim() || defaults.pageTitle
    mcpPageForm.pageDescription = String(config?.pageDescription || defaults.pageDescription).trim() || defaults.pageDescription
    mcpPageForm.showHeroStats = config?.showHeroStats !== false
    mcpPageForm.cardStyle = cardStyle === 'outline' ? 'outline' : defaults.cardStyle
    mcpPageForm.density = density === 'compact' ? 'compact' : defaults.density
    mcpPageForm.backgroundMode = backgroundMode === 'plain' || backgroundMode === 'grid' ? backgroundMode : defaults.backgroundMode
    mcpPageForm.accentColor = normalizeHexColor(config?.accentColor, defaults.accentColor)
    mcpPageForm.pageBackgroundColor = normalizeHexColor(config?.pageBackgroundColor, defaults.pageBackgroundColor)
    mcpPageForm.heroBackgroundColor = normalizeHexColor(config?.heroBackgroundColor, defaults.heroBackgroundColor)
    mcpPageForm.heroCoverImage = String(config?.heroCoverImage || defaults.heroCoverImage).trim()
    mcpPageForm.cardBorderColor = normalizeHexColor(config?.cardBorderColor, defaults.cardBorderColor)
    mcpPageForm.cardRadius = Number.isFinite(Number(config?.cardRadius))
        ? Math.max(10, Math.min(28, Number(config?.cardRadius)))
        : defaults.cardRadius
    mcpPageForm.cardShadowEnabled = config?.cardShadowEnabled === true
    mcpPageForm.showOfficialLink = config?.showOfficialLink !== false
    mcpPageForm.showTagFilter = config?.showTagFilter !== false
    mcpPageForm.tagFilterLimit = Number.isFinite(Number(config?.tagFilterLimit))
        ? Math.max(5, Math.min(60, Number(config?.tagFilterLimit)))
        : defaults.tagFilterLimit
    mcpPageForm.showCategoryCount = config?.showCategoryCount !== false
    mcpPageForm.listPageSize = Number.isFinite(Number(config?.listPageSize))
        ? Math.max(6, Math.min(48, Number(config?.listPageSize)))
        : defaults.listPageSize
    mcpPageForm.maxWidth = Number.isFinite(Number(config?.maxWidth))
        ? Math.max(960, Math.min(1800, Number(config?.maxWidth)))
        : defaults.maxWidth
    mcpPageForm.detailHeaderStyle = detailHeaderStyle === 'market' ? 'market' : defaults.detailHeaderStyle
    mcpPageForm.detailShowRating = config?.detailShowRating !== false
    mcpPageForm.detailRatingValue = Number.isFinite(Number(config?.detailRatingValue))
        ? Math.max(0, Math.min(5, Number(config?.detailRatingValue)))
        : defaults.detailRatingValue
    mcpPageForm.detailShowCommand = config?.detailShowCommand !== false
    mcpPageForm.detailCommandTemplate = String(config?.detailCommandTemplate || defaults.detailCommandTemplate).trim()
    mcpPageForm.detailShowVersionTag = config?.detailShowVersionTag !== false
}

/**
 * 回填 Figma 页面配置表单。
 */
const applyFigmaPageForm = (config: Record<string, any>) => {
    const defaults = getDefaultFigmaPageConfig()
    const cardClickAction = String(config?.cardClickAction || '').trim().toLowerCase()
    figmaPageForm.enabled = config?.enabled !== false
    figmaPageForm.listPageSize = Number.isFinite(Number(config?.listPageSize))
        ? Math.max(6, Math.min(72, Number(config?.listPageSize)))
        : defaults.listPageSize
    figmaPageForm.cardClickAction = cardClickAction === 'detail' ? 'detail' : defaults.cardClickAction
    figmaPageForm.cardClickNewWindow = config?.cardClickNewWindow !== false
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
 * 加载网站对比配置。
 */
const loadWebsiteCompareConfig = async () => {
    websiteCompareLoading.value = true
    try {
        const data = await uiedSettingGet({ key: 'websiteCompareConfig' })
        const config = data && typeof data === 'object' ? data : {}
        applyWebsiteCompareForm(config as Record<string, any>)
        websiteCompareInited.value = true
    } catch (error) {
        console.error('加载网站对比配置失败:', error)
        feedback.msgError('加载网站对比配置失败')
    } finally {
        websiteCompareLoading.value = false
    }
}

/**
 * 加载 MCP 页面配置。
 */
const loadMcpPageConfig = async () => {
    mcpPageLoading.value = true
    try {
        const data = await uiedSettingGet({ key: 'mcpPageConfig' })
        const config = data && typeof data === 'object' ? data : {}
        applyMcpPageForm(config as Record<string, any>)
        mcpPageInited.value = true
    } catch (error) {
        console.error('加载MCP页面配置失败:', error)
        feedback.msgError('加载MCP页面配置失败')
    } finally {
        mcpPageLoading.value = false
    }
}

/**
 * 加载 Figma 页面配置。
 */
const loadFigmaPageConfig = async () => {
    figmaPageLoading.value = true
    try {
        const data = await uiedSettingGet({ key: 'figmaPageConfig' })
        const config = data && typeof data === 'object' ? data : {}
        applyFigmaPageForm(config as Record<string, any>)
        figmaPageInited.value = true
    } catch (error) {
        console.error('加载Figma页面配置失败:', error)
        feedback.msgError('加载Figma页面配置失败')
    } finally {
        figmaPageLoading.value = false
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

/**
 * 构建网站对比配置的保存载荷。
 */
const buildWebsiteComparePayload = (): Record<string, any> => {
    const defaultCopywriting = getDefaultWebsiteCompareConfig().copywriting
    const metrics = (Array.isArray(websiteCompareForm.metrics) ? websiteCompareForm.metrics : [])
        .map((item, index) => ({
            key: item.key,
            label: String(item.label || item.key).trim() || item.key,
            enabled: item.enabled !== false,
            sort: Number.isFinite(Number(item.sort)) ? Number(item.sort) : (index + 1) * 10,
        }))
        .sort((a, b) => a.sort - b.sort)
    const faqItems = (Array.isArray(websiteCompareForm.faqItems) ? websiteCompareForm.faqItems : [])
        .map((item, index) => ({
            question: String(item.question || '').trim(),
            answer: String(item.answer || '').trim(),
            enabled: item.enabled !== false,
            sort: Number.isFinite(Number(item.sort)) ? Number(item.sort) : (index + 1) * 10,
        }))
        .filter(item => item.question && item.answer)
        .sort((a, b) => a.sort - b.sort)
    return {
        sections: {
            coreDiff: websiteCompareForm.sections.coreDiff !== false,
            guide: websiteCompareForm.sections.guide !== false,
            faq: websiteCompareForm.sections.faq !== false,
            internalLinks: websiteCompareForm.sections.internalLinks !== false,
            aiAnalysis: websiteCompareForm.sections.aiAnalysis !== false,
        },
        copywriting: {
            heroTitleTemplate: String(websiteCompareForm.copywriting.heroTitleTemplate || '').trim(),
            heroDescriptionTemplate: String(websiteCompareForm.copywriting.heroDescriptionTemplate || '').trim(),
            coreDiffTitle: String(websiteCompareForm.copywriting.coreDiffTitle || '').trim(),
            guideTitle: String(websiteCompareForm.copywriting.guideTitle || '').trim(),
            guideDescription: String(websiteCompareForm.copywriting.guideDescription || '').trim(),
            strengthTemplates: parseTemplateTextarea(
                websiteCompareForm.copywriting.strengthTemplates,
                defaultCopywriting.strengthTemplates.split('\n')
            ),
            cautionTemplates: parseTemplateTextarea(
                websiteCompareForm.copywriting.cautionTemplates,
                defaultCopywriting.cautionTemplates.split('\n')
            ),
            audienceTemplates: parseTemplateTextarea(
                websiteCompareForm.copywriting.audienceTemplates,
                defaultCopywriting.audienceTemplates.split('\n')
            ),
            recommendationTieTemplate: String(websiteCompareForm.copywriting.recommendationTieTemplate || '').trim(),
            recommendationLeadTemplate: String(websiteCompareForm.copywriting.recommendationLeadTemplate || '').trim(),
            faqTitle: String(websiteCompareForm.copywriting.faqTitle || '').trim(),
            internalLinksTitle: String(websiteCompareForm.copywriting.internalLinksTitle || '').trim(),
            internalLinksDescription: String(websiteCompareForm.copywriting.internalLinksDescription || '').trim(),
            aiAnalysisTitle: String(websiteCompareForm.copywriting.aiAnalysisTitle || '').trim(),
            aiAnalysisDescription: String(websiteCompareForm.copywriting.aiAnalysisDescription || '').trim(),
        },
        metrics,
        faqItems,
    }
}

/**
 * 保存网站对比配置。
 */
const saveWebsiteCompareConfig = async () => {
    websiteCompareSaving.value = true
    try {
        const payload = buildWebsiteComparePayload()
        await uiedSettingSave({ websiteCompareConfig: payload })
        feedback.msgSuccess('网站对比配置保存成功')
        websiteCompareInited.value = true
    } catch (error) {
        console.error('保存网站对比配置失败:', error)
        feedback.msgError('保存网站对比配置失败')
    } finally {
        websiteCompareSaving.value = false
    }
}

/**
 * 保存 MCP 页面配置。
 */
const saveMcpPageConfig = async () => {
    mcpPageSaving.value = true
    try {
        const payload: McpPageFormState = {
            enabled: mcpPageForm.enabled !== false,
            heroEnabled: mcpPageForm.heroEnabled !== false,
            heroStyle: mcpPageForm.heroStyle === 'solid' ? 'solid' : 'glass',
            visualPreset: mcpPageForm.visualPreset === 'tech' ? 'tech' : 'minimal',
            pageKicker: String(mcpPageForm.pageKicker || '').trim() || 'MCP HUB',
            pageTitle: String(mcpPageForm.pageTitle || '').trim() || 'MCP 中心',
            pageDescription: String(mcpPageForm.pageDescription || '').trim()
                || '集中收录可直接部署与接入的 MCP 服务，支持按分类和标签快速筛选。',
            showHeroStats: mcpPageForm.showHeroStats !== false,
            cardStyle: mcpPageForm.cardStyle === 'outline' ? 'outline' : 'elevated',
            density: mcpPageForm.density === 'compact' ? 'compact' : 'comfortable',
            backgroundMode: mcpPageForm.backgroundMode === 'plain' || mcpPageForm.backgroundMode === 'grid'
                ? mcpPageForm.backgroundMode
                : 'mesh',
            accentColor: normalizeHexColor(mcpPageForm.accentColor, '#2563eb'),
            pageBackgroundColor: normalizeHexColor(mcpPageForm.pageBackgroundColor, '#f2f6ff'),
            heroBackgroundColor: normalizeHexColor(mcpPageForm.heroBackgroundColor, '#eef4ff'),
            heroCoverImage: String(mcpPageForm.heroCoverImage || '').trim(),
            cardBorderColor: normalizeHexColor(mcpPageForm.cardBorderColor, '#dbe4ff'),
            cardRadius: Math.max(10, Math.min(28, Number(mcpPageForm.cardRadius || 16))),
            cardShadowEnabled: mcpPageForm.cardShadowEnabled === true,
            showOfficialLink: mcpPageForm.showOfficialLink !== false,
            showTagFilter: mcpPageForm.showTagFilter !== false,
            tagFilterLimit: Math.max(5, Math.min(60, Number(mcpPageForm.tagFilterLimit || 20))),
            showCategoryCount: mcpPageForm.showCategoryCount !== false,
            listPageSize: Math.max(6, Math.min(48, Number(mcpPageForm.listPageSize || 12))),
            maxWidth: Math.max(960, Math.min(1800, Number(mcpPageForm.maxWidth || 1280))),
            detailHeaderStyle: mcpPageForm.detailHeaderStyle === 'market' ? 'market' : 'classic',
            detailShowRating: mcpPageForm.detailShowRating !== false,
            detailRatingValue: Math.max(0, Math.min(5, Number(mcpPageForm.detailRatingValue || 0))),
            detailShowCommand: mcpPageForm.detailShowCommand !== false,
            detailCommandTemplate: String(mcpPageForm.detailCommandTemplate || '').trim().slice(0, 400),
            detailShowVersionTag: mcpPageForm.detailShowVersionTag !== false,
        }
        await uiedSettingSave({ mcpPageConfig: payload })
        feedback.msgSuccess('MCP页面配置保存成功')
        mcpPageInited.value = true
    } catch (error) {
        console.error('保存MCP页面配置失败:', error)
        feedback.msgError('保存MCP页面配置失败')
    } finally {
        mcpPageSaving.value = false
    }
}

/**
 * 保存 Figma 页面配置。
 */
const saveFigmaPageConfig = async () => {
    figmaPageSaving.value = true
    try {
        const payload: FigmaPageFormState = {
            enabled: figmaPageForm.enabled !== false,
            listPageSize: Math.max(6, Math.min(72, Number(figmaPageForm.listPageSize || 24))),
            cardClickAction: figmaPageForm.cardClickAction === 'detail' ? 'detail' : 'official_first',
            cardClickNewWindow: figmaPageForm.cardClickNewWindow !== false,
        }
        await uiedSettingSave({ figmaPageConfig: payload })
        feedback.msgSuccess('Figma页面配置保存成功')
        figmaPageInited.value = true
    } catch (error) {
        console.error('保存Figma页面配置失败:', error)
        feedback.msgError('保存Figma页面配置失败')
    } finally {
        figmaPageSaving.value = false
    }
}

/**
 * 恢复网站对比默认配置。
 */
const resetWebsiteCompareToDefault = async () => {
    const defaults = getDefaultWebsiteCompareConfig()
    applyWebsiteCompareForm(defaults as unknown as Record<string, any>)
    feedback.msgSuccess('已恢复网站对比默认配置，请点击“保存配置”生效')
}

/**
 * 新增 FAQ 项。
 */
const addWebsiteCompareFaq = () => {
    const nextSort = websiteCompareForm.faqItems.length > 0
        ? Math.max(...websiteCompareForm.faqItems.map(item => Number(item.sort || 0))) + 10
        : 10
    websiteCompareForm.faqItems.push({
        question: '',
        answer: '',
        enabled: true,
        sort: nextSort,
    })
}

/**
 * 删除 FAQ 项。
 */
const removeWebsiteCompareFaq = (index: number) => {
    websiteCompareForm.faqItems.splice(index, 1)
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
        if (value === 'websiteCompare' && !websiteCompareLoading.value && !websiteCompareInited.value) {
            loadWebsiteCompareConfig()
        }
        if (value === 'mcp' && !mcpPageLoading.value && !mcpPageInited.value) {
            loadMcpPageConfig()
        }
        if (value === 'figma' && !figmaPageLoading.value && !figmaPageInited.value) {
            loadFigmaPageConfig()
        }
    },
    { immediate: true }
)

onMounted(() => {
    if (activeTab.value === 'dailyNew') {
        loadDailyNewConfig()
    }
    if (activeTab.value === 'websiteCompare') {
        loadWebsiteCompareConfig()
    }
    if (activeTab.value === 'mcp') {
        loadMcpPageConfig()
    }
    if (activeTab.value === 'figma') {
        loadFigmaPageConfig()
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

.content-hub-setting__faq-actions {
    margin-bottom: 10px;
}

.content-hub-setting__faq-item {
    border: 1px solid #ebeef5;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;
}

.content-hub-setting__faq-item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
    color: #374151;
    font-size: 13px;
    font-weight: 600;
}

.content-hub-setting__faq-item-actions {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.content-hub-setting__color-field {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
}

.content-hub-setting__inline-column {
    display: inline-flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
}

.content-hub-setting__tip {
    font-size: 12px;
    color: #909399;
    line-height: 1.5;
}
</style>
