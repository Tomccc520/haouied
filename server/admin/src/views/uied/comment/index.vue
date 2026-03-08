<!--
 * @file views/uied/comment/index.vue
 * @description 评论管理页面
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
-->
<template>
    <div class="comment-lists">
        <!-- 统计卡片 -->
        <el-row :gutter="16" class="mb-4">
            <el-col :span="6">
                <el-card shadow="never" class="!border-none">
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="text-gray-400 text-sm">全部评论</div>
                            <div class="text-2xl font-bold mt-1">{{ stats.totalCount }}</div>
                        </div>
                        <el-icon :size="32" class="text-gray-300"><ChatDotRound /></el-icon>
                    </div>
                </el-card>
            </el-col>
            <el-col :span="6">
                <el-card shadow="never" class="!border-none">
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="text-gray-400 text-sm">待审核</div>
                            <div class="text-2xl font-bold mt-1 text-orange-500">
                                {{ stats.pendingCount }}
                            </div>
                        </div>
                        <el-icon :size="32" class="text-orange-300"><Clock /></el-icon>
                    </div>
                </el-card>
            </el-col>
            <el-col :span="6">
                <el-card shadow="never" class="!border-none">
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="text-gray-400 text-sm">已通过</div>
                            <div class="text-2xl font-bold mt-1 text-green-500">
                                {{ stats.approvedCount }}
                            </div>
                        </div>
                        <el-icon :size="32" class="text-green-300"><CircleCheck /></el-icon>
                    </div>
                </el-card>
            </el-col>
            <el-col :span="6">
                <el-card shadow="never" class="!border-none">
                    <div class="flex items-center justify-between">
                        <div>
                            <div class="text-gray-400 text-sm">已拒绝</div>
                            <div class="text-2xl font-bold mt-1 text-red-500">
                                {{ stats.rejectedCount }}
                            </div>
                        </div>
                        <el-icon :size="32" class="text-red-300"><CircleClose /></el-icon>
                    </div>
                </el-card>
            </el-col>
        </el-row>

        <!-- 筛选栏 -->
        <el-card class="!border-none" shadow="never">
            <el-form ref="formRef" class="mb-[-16px]" :model="queryParams" :inline="true">
                <el-form-item label="审核状态">
                    <el-select
                        class="w-[160px]"
                        v-model="queryParams.status"
                        placeholder="全部状态"
                        clearable
                    >
                        <el-option label="待审核" value="pending" />
                        <el-option label="已通过" value="approved" />
                        <el-option label="已拒绝" value="rejected" />
                    </el-select>
                </el-form-item>
                <el-form-item label="评论类型">
                    <el-select
                        class="w-[160px]"
                        v-model="queryParams.type"
                        placeholder="全部类型"
                        clearable
                    >
                        <el-option label="网址详情评论" value="website" />
                        <el-option label="文章详情评论" value="article" />
                    </el-select>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="resetPage">查询</el-button>
                    <el-button @click="resetParams">重置</el-button>
                </el-form-item>
            </el-form>
        </el-card>

        <!-- 评论列表 -->
        <el-card class="!border-none mt-4" shadow="never">
            <div class="comment-toolbar">
                <div class="comment-toolbar-switches">
                    <div class="comment-switch-item">
                        <span class="comment-switch-label">网址详情评论</span>
                        <el-switch
                            v-model="commentSwitch.websiteEnabled"
                            :loading="switchLoading.website"
                            :disabled="switchLoading.website"
                            inline-prompt
                            active-text="开"
                            inactive-text="关"
                            @change="
                                (value) => handleToggleCommentSwitch('website', Boolean(value))
                            "
                        />
                    </div>
                    <div class="comment-switch-item">
                        <span class="comment-switch-label">文章详情评论</span>
                        <el-switch
                            v-model="commentSwitch.articleEnabled"
                            :loading="switchLoading.article"
                            :disabled="switchLoading.article"
                            inline-prompt
                            active-text="开"
                            inactive-text="关"
                            @change="
                                (value) => handleToggleCommentSwitch('article', Boolean(value))
                            "
                        />
                    </div>
                    <div class="comment-switch-item">
                        <span class="comment-switch-label">登录后评论</span>
                        <el-switch
                            v-model="commentSwitch.loginRequired"
                            :loading="switchLoading.loginRequired"
                            :disabled="switchLoading.loginRequired"
                            inline-prompt
                            active-text="开"
                            inactive-text="关"
                            @change="
                                (value) =>
                                    handleToggleCommentSwitch('loginRequired', Boolean(value))
                            "
                        />
                    </div>
                </div>
                <div class="comment-toolbar-actions">
                    <el-tag class="comment-audit-entry" effect="plain" @click="openAuditDrawer">
                        自动审核与文字检测
                    </el-tag>
                </div>
            </div>
            <div class="mb-4 flex justify-between">
                <div class="flex items-center gap-2">
                    <span class="text-gray-500">评论管理</span>
                    <el-badge v-if="pendingCount > 0" :value="pendingCount" class="ml-1" />
                </div>
                <div class="text-gray-400">共 {{ pager.count }} 条评论</div>
            </div>
            <el-table size="large" v-loading="pager.loading" :data="pager.lists">
                <el-table-column label="ID" prop="id" width="70" />
                <el-table-column label="评论内容" min-width="250">
                    <template #default="{ row }">
                        <span class="text-gray-700">
                            {{ truncateContent(row.content, 100) }}
                        </span>
                    </template>
                </el-table-column>
                <el-table-column label="类型" width="100">
                    <template #default="{ row }">
                        <el-tag v-if="row.type === 'website'" size="small">网站</el-tag>
                        <el-tag v-else-if="row.type === 'article'" type="info" size="small"
                            >文章</el-tag
                        >
                        <el-tag v-else size="small">{{ row.type }}</el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="评论对象" prop="targetName" min-width="150">
                    <template #default="{ row }">
                        <span v-if="row.targetName" class="text-gray-600">{{
                            row.targetName
                        }}</span>
                        <span v-else class="text-gray-400">-</span>
                    </template>
                </el-table-column>
                <el-table-column label="作者" width="120">
                    <template #default="{ row }">
                        <span class="text-gray-600">{{
                            row.author || row.nickname || '匿名'
                        }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="状态" width="100">
                    <template #default="{ row }">
                        <el-tag v-if="row.status === 'pending'" type="warning" size="small"
                            >待审核</el-tag
                        >
                        <el-tag v-else-if="row.status === 'approved'" type="success" size="small"
                            >已通过</el-tag
                        >
                        <el-tag v-else-if="row.status === 'rejected'" type="danger" size="small"
                            >已拒绝</el-tag
                        >
                        <el-tag v-else size="small">{{ row.status }}</el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="审核命中" min-width="240">
                    <template #default="{ row }">
                        <div v-if="hasAuditInsight(row)" class="audit-insight-cell">
                            <el-tag
                                v-if="showRiskScore(row)"
                                size="small"
                                :type="getRiskTagType(row.riskLevel)"
                                class="audit-risk-tag"
                            >
                                风险{{ normalizeRiskScore(row.riskScore) }}
                            </el-tag>
                            <el-tag
                                v-for="(reasonTag, index) in getAuditReasonTags(row)"
                                :key="`${row.id}-reason-${index}`"
                                size="small"
                                effect="plain"
                            >
                                {{ reasonTag }}
                            </el-tag>
                        </div>
                        <span v-else class="text-gray-400">-</span>
                    </template>
                </el-table-column>
                <el-table-column label="评论时间" width="170">
                    <template #default="{ row }">
                        <span class="text-gray-400">{{ formatTime(row.create_time) }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="操作" width="200" fixed="right">
                    <template #default="{ row }">
                        <template v-if="row.status === 'pending'">
                            <el-button type="success" link @click="handleApprove(row)"
                                >通过</el-button
                            >
                            <el-button type="warning" link @click="handleReject(row)"
                                >拒绝</el-button
                            >
                        </template>
                        <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
                    </template>
                </el-table-column>
            </el-table>
            <div class="flex justify-end mt-4">
                <pagination v-model="pager" @change="getLists" />
            </div>
        </el-card>

        <el-drawer
            v-model="auditDrawerVisible"
            title="自动审核与文字检测"
            direction="rtl"
            size="560px"
            :append-to-body="true"
        >
            <el-form :model="commentAuditConfig" label-width="130px" size="small">
                <el-form-item label="审核模式">
                    <el-radio-group v-model="commentAuditConfig.autoAuditMode">
                        <el-radio-button label="off">关闭（直接通过）</el-radio-button>
                        <el-radio-button label="manual">全部待审核</el-radio-button>
                        <el-radio-button label="smart">智能审核</el-radio-button>
                    </el-radio-group>
                </el-form-item>
                <el-form-item label="文本检测">
                    <el-switch
                        v-model="commentAuditConfig.enableTextDetection"
                        :disabled="commentAuditConfig.autoAuditMode !== 'smart'"
                    />
                </el-form-item>
                <el-form-item label="命中敏感词处理">
                    <el-switch
                        v-model="commentAuditConfig.autoRejectSensitive"
                        :disabled="
                            commentAuditConfig.autoAuditMode !== 'smart' ||
                            !commentAuditConfig.enableTextDetection
                        "
                        active-text="自动拒绝"
                        inactive-text="转待审核"
                    />
                </el-form-item>
                <el-form-item label="敏感词库">
                    <el-input
                        v-model="commentAuditConfig.sensitiveWords"
                        type="textarea"
                        :rows="2"
                        maxlength="2000"
                        show-word-limit
                        placeholder="多个词用逗号/分号/换行分隔"
                        :disabled="
                            commentAuditConfig.autoAuditMode !== 'smart' ||
                            !commentAuditConfig.enableTextDetection
                        "
                    />
                </el-form-item>
                <el-form-item label="疑似词转待审">
                    <el-switch
                        v-model="commentAuditConfig.autoPendingSuspicious"
                        :disabled="
                            commentAuditConfig.autoAuditMode !== 'smart' ||
                            !commentAuditConfig.enableTextDetection
                        "
                    />
                </el-form-item>
                <el-form-item label="疑似词库">
                    <el-input
                        v-model="commentAuditConfig.suspiciousWords"
                        type="textarea"
                        :rows="2"
                        maxlength="2000"
                        show-word-limit
                        placeholder="如：广告、引流、推广等"
                        :disabled="
                            commentAuditConfig.autoAuditMode !== 'smart' ||
                            !commentAuditConfig.enableTextDetection ||
                            !commentAuditConfig.autoPendingSuspicious
                        "
                    />
                </el-form-item>
                <el-form-item label="最小长度">
                    <el-input-number
                        v-model="commentAuditConfig.minLength"
                        :min="0"
                        :max="500"
                        :disabled="
                            commentAuditConfig.autoAuditMode !== 'smart' ||
                            !commentAuditConfig.enableTextDetection
                        "
                    />
                </el-form-item>
                <el-form-item label="最大链接数">
                    <el-input-number
                        v-model="commentAuditConfig.maxLinkCount"
                        :min="0"
                        :max="50"
                        :disabled="
                            commentAuditConfig.autoAuditMode !== 'smart' ||
                            !commentAuditConfig.enableTextDetection
                        "
                    />
                </el-form-item>
                <el-form-item label="重复评论检测">
                    <el-switch
                        v-model="commentAuditConfig.duplicateCheckEnabled"
                        :disabled="commentAuditConfig.autoAuditMode !== 'smart'"
                    />
                </el-form-item>
                <el-form-item label="重复窗口（秒）">
                    <el-input-number
                        v-model="commentAuditConfig.duplicateWindowSec"
                        :min="10"
                        :max="86400"
                        :disabled="
                            commentAuditConfig.autoAuditMode !== 'smart' ||
                            !commentAuditConfig.duplicateCheckEnabled
                        "
                    />
                </el-form-item>
                <el-form-item label="重复阈值（次）">
                    <el-input-number
                        v-model="commentAuditConfig.duplicateThreshold"
                        :min="2"
                        :max="100"
                        :disabled="
                            commentAuditConfig.autoAuditMode !== 'smart' ||
                            !commentAuditConfig.duplicateCheckEnabled
                        "
                    />
                </el-form-item>
            </el-form>
            <div class="comment-audit-drawer-actions">
                <el-button @click="auditDrawerVisible = false">关闭</el-button>
                <el-button
                    type="primary"
                    :loading="auditConfigLoading"
                    @click="handleSaveCommentAuditConfig"
                >
                    保存审核规则
                </el-button>
            </div>
        </el-drawer>
    </div>
</template>

<script lang="ts" setup name="uiedComment">
/**
 * @file views/uied/comment/index.vue
 * @description 评论管理页面
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */
import {
    uiedCommentList,
    uiedCommentApprove,
    uiedCommentReject,
    uiedCommentDelete,
    uiedCommentPendingCount,
    uiedCommentStats,
    uiedSettingGet,
    uiedSettingSave,
    uiedArticleConfig,
    uiedSaveArticleConfig
} from '@/api/uied'
import { usePaging } from '@/hooks/usePaging'
import feedback from '@/utils/feedback'
import { ChatDotRound, Clock, CircleCheck, CircleClose } from '@element-plus/icons-vue'

// 筛选参数
const queryParams = reactive({
    status: '',
    type: '',
    withAuditInsight: 1
})

const { pager, getLists, resetPage, resetParams } = usePaging({
    fetchFun: uiedCommentList,
    params: queryParams
})

// 统计数据
const stats = reactive({
    totalCount: 0,
    pendingCount: 0,
    approvedCount: 0,
    rejectedCount: 0
})

// 待审核数量（用于 badge 显示）
const pendingCount = ref(0)
const switchLoading = reactive({
    website: false,
    article: false,
    loginRequired: false
})
const auditDrawerVisible = ref(false)
const commentSwitch = reactive({
    websiteEnabled: true,
    articleEnabled: true,
    loginRequired: false
})
const auditConfigLoading = ref(false)
const defaultCommentAuditConfig = {
    autoAuditMode: 'off' as 'off' | 'manual' | 'smart',
    enableTextDetection: true,
    autoRejectSensitive: true,
    sensitiveWords: '',
    autoPendingSuspicious: true,
    suspiciousWords: '',
    minLength: 2,
    maxLinkCount: 2,
    duplicateCheckEnabled: true,
    duplicateWindowSec: 300,
    duplicateThreshold: 2
}
const commentAuditConfig = reactive({ ...defaultCommentAuditConfig })

/**
 * 判断是否为请求取消异常（用于忽略并发去重场景下的误报）。
 */
const isCanceledRequestError = (error: any): boolean => {
    const code = String(error?.code || '').trim()
    const name = String(error?.name || '').trim()
    return code === 'ERR_CANCELED' || name === 'CanceledError'
}

/**
 * 规范化评论审核配置，避免输入越界与非法模式。
 */
const normalizeCommentAuditConfig = (config: any) => {
    const mode = String(config?.autoAuditMode || '').trim().toLowerCase()
    const normalizeNumber = (value: unknown, min: number, max: number, fallback: number) => {
        const num = Number(value)
        if (!Number.isFinite(num)) return fallback
        return Math.max(min, Math.min(max, Math.round(num)))
    }
    return {
        autoAuditMode: (['off', 'manual', 'smart'] as const).includes(mode as any)
            ? (mode as 'off' | 'manual' | 'smart')
            : defaultCommentAuditConfig.autoAuditMode,
        enableTextDetection: config?.enableTextDetection !== false,
        autoRejectSensitive: config?.autoRejectSensitive !== false,
        sensitiveWords: String(config?.sensitiveWords || '').trim(),
        autoPendingSuspicious: config?.autoPendingSuspicious !== false,
        suspiciousWords: String(config?.suspiciousWords || '').trim(),
        minLength: normalizeNumber(
            config?.minLength,
            0,
            500,
            defaultCommentAuditConfig.minLength
        ),
        maxLinkCount: normalizeNumber(
            config?.maxLinkCount,
            0,
            50,
            defaultCommentAuditConfig.maxLinkCount
        ),
        duplicateCheckEnabled: config?.duplicateCheckEnabled !== false,
        duplicateWindowSec: normalizeNumber(
            config?.duplicateWindowSec,
            10,
            86400,
            defaultCommentAuditConfig.duplicateWindowSec
        ),
        duplicateThreshold: normalizeNumber(
            config?.duplicateThreshold,
            2,
            100,
            defaultCommentAuditConfig.duplicateThreshold
        )
    }
}

/**
 * 解析配置项中的布尔值，兼容 boolean/number/string 形式。
 */
const parseBooleanSetting = (value: unknown, defaultValue: boolean): boolean => {
    if (value === null || value === undefined) return defaultValue
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value !== 0
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase()
        if (['true', '1', 'yes', 'on'].includes(normalized)) return true
        if (['false', '0', 'no', 'off'].includes(normalized)) return false
    }
    return defaultValue
}

/**
 * 标准化评论类型，避免传入非法值导致后端默认回退异常。
 */
const normalizeCommentType = (value: unknown): 'website' | 'article' => {
    return String(value || '').trim().toLowerCase() === 'article' ? 'article' : 'website'
}

/**
 * 解析评论主键，兼容字符串/数字两种输入。
 */
const resolveCommentId = (value: unknown): number => {
    const id = Number.parseInt(String(value ?? ''), 10)
    return Number.isInteger(id) && id > 0 ? id : 0
}

// 获取统计数据
const getStats = async () => {
    try {
        const res = await uiedCommentStats()
        stats.totalCount = res?.totalCount ?? 0
        stats.pendingCount = res?.pendingCount ?? 0
        stats.approvedCount = res?.approvedCount ?? 0
        stats.rejectedCount = res?.rejectedCount ?? 0
    } catch (error) {
        console.error('获取评论统计失败:', error)
    }
}

// 获取待审核数量
const getPendingCount = async () => {
    try {
        const res = await uiedCommentPendingCount()
        pendingCount.value = res?.count ?? 0
    } catch (error) {
        console.error('获取待审核数量失败:', error)
    }
}

/**
 * 加载评论开关配置（网址详情评论 + 文章详情评论）。
 */
const loadCommentSwitches = async () => {
    try {
        /**
         * 注意：uiedSettingGet 走同一路由（/uied/setting/get），
         * 请求层会对同 URL 做取消去重。这里改为串行读取，避免并发触发 ERR_CANCELED。
         */
        const detailPageConfig = await uiedSettingGet({ key: 'detailPageConfig' })
        const articleConfig = await uiedArticleConfig()
        const commentConfig = await uiedSettingGet({ key: 'commentConfig' })
        const normalizedCommentConfig = normalizeCommentAuditConfig(commentConfig || {})
        commentSwitch.websiteEnabled = parseBooleanSetting(detailPageConfig?.commentsEnabled, true)
        commentSwitch.articleEnabled = parseBooleanSetting(articleConfig?.commentsEnabled, true)
        commentSwitch.loginRequired = parseBooleanSetting(commentConfig?.loginRequired, false)
        Object.assign(commentAuditConfig, normalizedCommentConfig)
    } catch (error) {
        if (isCanceledRequestError(error)) return
        console.error('加载评论开关配置失败:', error)
    }
}

/**
 * 打开评论审核配置抽屉，并同步读取最新规则。
 */
const openAuditDrawer = async () => {
    await loadCommentSwitches()
    auditDrawerVisible.value = true
}

/**
 * 保存网址详情评论开关（合并当前配置，避免覆盖其他详情页设置）。
 */
const saveWebsiteCommentSwitch = async (enabled: boolean) => {
    const currentConfig = (await uiedSettingGet({ key: 'detailPageConfig' })) || {}
    await uiedSettingSave({
        detailPageConfig: {
            ...currentConfig,
            commentsEnabled: Boolean(enabled)
        }
    })
}

/**
 * 保存文章评论开关（合并当前配置，避免覆盖文章页其他设置）。
 */
const saveArticleCommentSwitch = async (enabled: boolean) => {
    const currentConfig = (await uiedArticleConfig()) || {}
    await uiedSaveArticleConfig({
        ...currentConfig,
        commentsEnabled: Boolean(enabled)
    })
}

/**
 * 保存评论登录限制开关（全站评论统一生效）。
 */
const saveCommentLoginRequiredSwitch = async (enabled: boolean) => {
    const currentConfig = (await uiedSettingGet({ key: 'commentConfig' })) || {}
    await uiedSettingSave({
        commentConfig: {
            ...currentConfig,
            loginRequired: Boolean(enabled)
        }
    })
}

/**
 * 保存自动审核与文字检测规则
 */
const handleSaveCommentAuditConfig = async () => {
    auditConfigLoading.value = true
    try {
        const currentConfig = (await uiedSettingGet({ key: 'commentConfig' })) || {}
        const normalizedConfig = normalizeCommentAuditConfig(commentAuditConfig)
        await uiedSettingSave({
            commentConfig: {
                ...currentConfig,
                ...normalizedConfig,
                loginRequired: commentSwitch.loginRequired === true
            }
        })
        feedback.msgSuccess('评论审核规则保存成功')
        await loadCommentSwitches()
    } catch (error: any) {
        feedback.msgError(error?.msg || error?.message || '评论审核规则保存失败')
    } finally {
        auditConfigLoading.value = false
    }
}

/**
 * 切换评论开关并持久化，失败时自动回滚显示状态。
 */
const handleToggleCommentSwitch = async (
    target: 'website' | 'article' | 'loginRequired',
    enabled: boolean
) => {
    const loadingKey = target === 'website' ? 'website' : target === 'article' ? 'article' : 'loginRequired'
    const previousEnabled = !enabled
    switchLoading[loadingKey] = true
    try {
        if (target === 'website') {
            await saveWebsiteCommentSwitch(enabled)
            feedback.msgSuccess(`网址详情评论已${enabled ? '开启' : '关闭'}`)
        } else if (target === 'article') {
            await saveArticleCommentSwitch(enabled)
            feedback.msgSuccess(`文章详情评论已${enabled ? '开启' : '关闭'}`)
        } else {
            await saveCommentLoginRequiredSwitch(enabled)
            feedback.msgSuccess(`登录后评论已${enabled ? '开启' : '关闭'}`)
        }
    } catch (error: any) {
        feedback.msgError(error?.msg || error?.message || '评论开关保存失败')
        if (target === 'website') {
            commentSwitch.websiteEnabled = previousEnabled
        } else if (target === 'article') {
            commentSwitch.articleEnabled = previousEnabled
        } else {
            commentSwitch.loginRequired = previousEnabled
        }
    } finally {
        switchLoading[loadingKey] = false
    }
}

/**
 * 规范化风险分（0-100）。
 */
const normalizeRiskScore = (value: unknown): number => {
    const score = Number(value)
    if (!Number.isFinite(score)) return 0
    return Math.max(0, Math.min(100, Math.round(score)))
}

/**
 * 获取评论命中标签列表（空值自动过滤）。
 */
const getAuditReasonTags = (row: any): string[] => {
    const tags = Array.isArray(row?.auditReasonTags) ? row.auditReasonTags : []
    return tags
        .map((item: unknown) => String(item || '').trim())
        .filter((item: string) => Boolean(item))
        .slice(0, 5)
}

/**
 * 判断当前行是否需要展示审核洞察信息。
 */
const hasAuditInsight = (row: any): boolean => {
    return getAuditReasonTags(row).length > 0 || normalizeRiskScore(row?.riskScore) > 0
}

/**
 * 判断是否显示风险分标签。
 */
const showRiskScore = (row: any): boolean => {
    return normalizeRiskScore(row?.riskScore) > 0
}

/**
 * 根据风险等级返回标签主题色。
 */
const getRiskTagType = (level: unknown): 'danger' | 'warning' | 'info' => {
    const normalized = String(level || '').trim().toLowerCase()
    if (normalized === 'high') return 'danger'
    if (normalized === 'medium') return 'warning'
    return 'info'
}

// 截断评论内容
const truncateContent = (content: string, maxLen: number): string => {
    if (!content) return '-'
    return content.length > maxLen ? content.substring(0, maxLen) + '...' : content
}

// 格式化时间戳（unix 秒 → 可读日期）
const formatTime = (timestamp: number): string => {
    if (!timestamp) return '-'
    const date = new Date(timestamp * 1000)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

// 审核通过
const handleApprove = async (row: any) => {
    const id = resolveCommentId(row?.id)
    if (!id) {
        feedback.msgError('缺少评论ID')
        return
    }
    await uiedCommentApprove({ id, type: normalizeCommentType(row?.type) })
    feedback.msgSuccess('审核通过')
    refreshData()
}

// 审核拒绝
const handleReject = async (row: any) => {
    const id = resolveCommentId(row?.id)
    if (!id) {
        feedback.msgError('缺少评论ID')
        return
    }
    await uiedCommentReject({ id, type: normalizeCommentType(row?.type) })
    feedback.msgSuccess('已拒绝')
    refreshData()
}

// 删除评论
const handleDelete = async (row: any) => {
    const id = resolveCommentId(row?.id)
    if (!id) {
        feedback.msgError('缺少评论ID')
        return
    }
    await feedback.confirm('确定要删除该评论吗？删除后无法恢复。')
    await uiedCommentDelete({
        ids: [id],
        type: normalizeCommentType(row?.type)
    })
    feedback.msgSuccess('删除成功')
    refreshData()
}

// 刷新列表和统计数据
const refreshData = () => {
    getLists()
    getStats()
    getPendingCount()
}

// 初始化加载
getLists()
getStats()
getPendingCount()
loadCommentSwitches()
</script>

<style scoped>
.comment-toolbar {
    margin-top: 8px;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
}

.comment-toolbar-switches {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
}

.comment-toolbar-actions {
    display: inline-flex;
    align-items: center;
}

.comment-switch-item {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    padding: 4px 10px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    background: var(--el-fill-color-blank);
}

.comment-switch-label {
    font-size: 13px;
    color: var(--el-text-color-secondary);
}

.comment-audit-entry {
    cursor: pointer;
    user-select: none;
}

.comment-audit-drawer-actions {
    margin-top: 12px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}

.audit-insight-cell {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
}

.audit-risk-tag {
    font-weight: 600;
}
</style>
