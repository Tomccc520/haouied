<!--
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026.3.18
-->
<template>
    <div class="uied-license-page">
        <el-card class="!border-none mb-4" shadow="never">
            <template #header>
                <div class="flex items-center justify-between">
                    <span class="font-medium">授权运行状态</span>
                    <el-tag :type="resolveLicenseStatusTag(runtimeState.status)">
                        {{ resolveLicenseStatusText(runtimeState.status) }}
                    </el-tag>
                </div>
            </template>
            <el-descriptions :column="2" border>
                <el-descriptions-item label="生效版本">
                    <el-tag type="success">{{
                        resolveEditionText(runtimeState.effectiveEdition)
                    }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="许可证版本">
                    <span>{{ resolveEditionText(runtimeState.edition) }}</span>
                </el-descriptions-item>
                <el-descriptions-item label="到期时间">
                    <span>{{ formatUnixTime(runtimeState.expiresAt) }}</span>
                </el-descriptions-item>
                <el-descriptions-item label="剩余时长">
                    <el-tag :type="expiryMeta.tagType">{{ expiryMeta.label }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="域名额度">
                    <span>{{ runtimeState.domainUsedCount }}/{{ runtimeState.domainLimit }}</span>
                </el-descriptions-item>
                <el-descriptions-item label="当前访问域名">
                    <span>{{ runtimeState.runtimeDomain || '（本地/未识别）' }}</span>
                </el-descriptions-item>
                <el-descriptions-item label="已登记域名" :span="2">
                    <span>{{
                        runtimeState.registeredDomains.length > 0
                            ? runtimeState.registeredDomains.join('、')
                            : '暂无'
                    }}</span>
                </el-descriptions-item>
            </el-descriptions>
            <el-alert
                v-if="runtimeState.domainEnforceEnabled && !runtimeState.isDomainAuthorized"
                class="mt-4"
                type="error"
                :closable="false"
                title="当前域名未授权：已超过域名绑定上限，请调整授权白名单或提高域名上限。"
            />
            <el-alert
                v-else-if="expiryMeta.alertType !== 'none'"
                class="mt-4"
                :type="expiryMeta.alertType"
                :closable="false"
                :title="expiryMeta.alertText"
            />
        </el-card>

        <el-card class="!border-none" shadow="never">
            <template #header>
                <div class="flex items-center justify-between">
                    <span class="font-medium">许可证中心</span>
                    <el-button type="primary" :loading="licenseSaving" @click="handleSaveLicense">
                        保存许可证
                    </el-button>
                </div>
            </template>
            <el-alert
                title="这里维护许可证、商业模式与授权运行状态。"
                type="info"
                :closable="false"
                class="mb-4"
            />
            <el-form :model="licenseForm" label-width="120px" class="max-w-[760px]">
                <el-form-item label="版本等级">
                    <el-select v-model="licenseForm.edition" class="w-[220px]">
                        <el-option label="Free" value="free" />
                        <el-option label="Pro" value="pro" />
                        <el-option label="Enterprise" value="enterprise" />
                    </el-select>
                </el-form-item>
                <el-form-item label="许可证状态">
                    <el-select v-model="licenseForm.status" class="w-[220px]">
                        <el-option label="激活" value="active" />
                        <el-option label="禁用" value="disabled" />
                    </el-select>
                </el-form-item>
                <el-form-item label="许可证密钥">
                    <el-input v-model="licenseForm.licenseKey" placeholder="请输入许可证密钥" />
                </el-form-item>
                <el-form-item label="客户名称">
                    <el-input v-model="licenseForm.customerName" placeholder="请输入客户名称" />
                </el-form-item>
                <el-form-item label="公司名称">
                    <el-input v-model="licenseForm.companyName" placeholder="请输入公司名称" />
                </el-form-item>
                <el-form-item label="联系邮箱">
                    <el-input v-model="licenseForm.contactEmail" placeholder="请输入联系邮箱" />
                </el-form-item>
                <el-form-item label="域名绑定上限">
                    <el-input-number v-model="licenseForm.domainLimit" :min="1" :max="9999" />
                </el-form-item>
                <el-form-item label="授权域名白名单">
                    <el-input
                        v-model="domainWhitelistText"
                        type="textarea"
                        :rows="3"
                        placeholder="支持逗号或换行分隔，例如：demo.uied.cn, nav.fsuied.com"
                    />
                    <div class="text-xs text-tx-secondary mt-2">
                        白名单域名始终占用授权额度；其余域名在首次访问时会自动登记（开启“域名绑定数量限制”后生效）。
                    </div>
                </el-form-item>
                <el-form-item label="签发时间(秒)">
                    <el-input-number v-model="licenseForm.issuedAt" :min="0" :step="86400" />
                </el-form-item>
                <el-form-item label="到期时间(秒)">
                    <el-input-number v-model="licenseForm.expiresAt" :min="0" :step="86400" />
                </el-form-item>
                <el-form-item label="备注">
                    <el-input
                        v-model="licenseForm.note"
                        type="textarea"
                        :rows="3"
                        placeholder="可填写授权备注"
                    />
                </el-form-item>
            </el-form>
        </el-card>

        <el-card class="!border-none mt-4" shadow="never">
            <template #header>
                <div class="flex items-center justify-between">
                    <span class="font-medium">商业版模式开关</span>
                    <el-button
                        v-perms="['uied:commercial:mode:save']"
                        type="primary"
                        :loading="modeSaving"
                        @click="handleSaveMode"
                    >
                        保存商业模式
                    </el-button>
                </div>
            </template>
            <el-form :model="modeForm" label-width="180px" class="max-w-[760px]">
                <el-form-item label="严格商业版模式">
                    <el-switch v-model="modeForm.strictLegacyRoutes" />
                    <span class="ml-3 text-xs text-tx-secondary">
                        开启后关闭旧兼容路由，仅允许 /api 正式路由访问
                    </span>
                </el-form-item>
                <el-form-item label="强制许可证签名校验">
                    <el-switch v-model="modeForm.enforceLicenseSignature" />
                    <span class="ml-3 text-xs text-tx-secondary">
                        开启后若 license 签名异常将自动降级为 Free 能力
                    </span>
                </el-form-item>
                <el-form-item label="域名绑定数量限制">
                    <el-switch v-model="modeForm.enforceDomainBinding" />
                    <span class="ml-3 text-xs text-tx-secondary">
                        开启后按“域名绑定上限”控制可授权域名数，超过上限将自动降级为 Free 能力
                    </span>
                </el-form-item>
            </el-form>
        </el-card>

        <el-card class="!border-none mt-4" shadow="never">
            <template #header>
                <div class="flex items-center justify-between">
                    <span class="font-medium">商业版健康总览</span>
                    <el-tag :type="resolveOverviewLevelTag(overviewState.level)">
                        评分 {{ overviewState.score }}
                    </el-tag>
                </div>
            </template>
            <el-empty v-if="overviewState.checks.length === 0" description="暂无总览数据" />
            <div v-else class="overview-check-list">
                <div
                    v-for="item in overviewState.checks"
                    :key="item.key"
                    class="overview-check-item"
                >
                    <el-tag :type="resolveCheckTagType(item.status)" size="small">
                        {{ item.status.toUpperCase() }}
                    </el-tag>
                    <span class="overview-check-text">{{ item.message }}</span>
                </div>
            </div>
        </el-card>
    </div>
</template>

<script lang="ts" setup name="uiedLicenseCenter">
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026.3.18
 */
import { computed, onMounted, reactive, ref } from 'vue'
import feedback from '@/utils/feedback'
import {
    uiedCommercialOverview,
    uiedCommercialModeGet,
    uiedCommercialModeSave,
    uiedLicenseInfo,
    uiedSaveLicenseInfo
} from '@/api/uied'

type ElTagType = '' | 'success' | 'warning' | 'info' | 'danger'
type ElAlertType = 'none' | 'success' | 'warning' | 'info' | 'error'

const licenseSaving = ref(false)
const modeSaving = ref(false)
const domainWhitelistText = ref('')

const licenseForm = reactive({
    edition: 'free',
    status: 'active',
    licenseKey: '',
    customerName: '',
    companyName: '',
    contactEmail: '',
    domainLimit: 1,
    issuedAt: 0,
    expiresAt: 0,
    note: ''
})
const modeForm = reactive({
    strictLegacyRoutes: false,
    enforceLicenseSignature: false,
    enforceDomainBinding: false
})
const runtimeState = reactive({
    edition: 'free',
    effectiveEdition: 'free',
    status: 'active',
    isActive: false,
    isExpired: false,
    now: 0,
    expiresAt: 0,
    runtimeDomain: '',
    domainLimit: 1,
    domainUsedCount: 0,
    domainRemainingCount: 0,
    domainEnforceEnabled: false,
    isDomainAuthorized: true,
    registeredDomains: [] as string[]
})
const overviewState = reactive({
    score: 0,
    level: 'ready',
    checks: [] as Array<{ key: string; status: string; message: string }>
})

/**
 * 解析授权域名白名单输入（支持逗号和换行）
 */
const parseDomainWhitelist = () => {
    return domainWhitelistText.value
        .split(/[\n,]/g)
        .map((item) => item.trim())
        .filter(Boolean)
}

/**
 * 格式化 Unix 秒级时间
 */
const formatUnixTime = (unixSeconds: number) => {
    if (!unixSeconds || unixSeconds <= 0) return '永久授权'
    const date = new Date(unixSeconds * 1000)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hour}:${minute}`
}

/**
 * 计算授权到期状态文案
 */
const expiryMeta = computed<{
    label: string
    tagType: ElTagType
    alertType: ElAlertType
    alertText: string
}>(() => {
    if (!runtimeState.expiresAt || runtimeState.expiresAt <= 0) {
        return {
            label: '永久授权',
            tagType: 'success',
            alertType: 'none',
            alertText: ''
        }
    }
    const nowSeconds = Number(runtimeState.now || Math.floor(Date.now() / 1000))
    const remainSeconds = runtimeState.expiresAt - nowSeconds
    const remainDays = Math.ceil(remainSeconds / 86400)
    if (remainDays < 0) {
        return {
            label: `已过期 ${Math.abs(remainDays)} 天`,
            tagType: 'danger',
            alertType: 'error',
            alertText: '许可证已过期，请更新授权信息。'
        }
    }
    if (remainDays <= 7) {
        return {
            label: `剩余 ${remainDays} 天`,
            tagType: 'danger',
            alertType: 'warning',
            alertText: `许可证将在 ${remainDays} 天内到期，请提前续期。`
        }
    }
    if (remainDays <= 30) {
        return {
            label: `剩余 ${remainDays} 天`,
            tagType: 'warning',
            alertType: 'info',
            alertText: `许可证剩余 ${remainDays} 天，建议安排续期。`
        }
    }
    return {
        label: `剩余 ${remainDays} 天`,
        tagType: 'success',
        alertType: 'none',
        alertText: ''
    }
})

/**
 * 版本文案转换
 */
const resolveEditionText = (edition: string) => {
    const text = String(edition || '').toLowerCase()
    if (text === 'enterprise') return 'Enterprise'
    if (text === 'pro') return 'Pro'
    return 'Free'
}

/**
 * 授权状态对应标签颜色
 */
const resolveLicenseStatusTag = (status: string): ElTagType => {
    if (status === 'active') return 'success'
    if (['invalid_signature', 'domain_limit_exceeded'].includes(status)) return 'danger'
    if (status === 'disabled') return 'warning'
    return 'info'
}

/**
 * 授权状态对应文案
 */
const resolveLicenseStatusText = (status: string) => {
    if (status === 'active') return '已激活'
    if (status === 'invalid_signature') return '签名无效'
    if (status === 'domain_limit_exceeded') return '域名超限'
    if (status === 'disabled') return '已禁用'
    return status || '未知'
}

/**
 * 总览级别标签颜色
 */
const resolveOverviewLevelTag = (level: string): ElTagType => {
    if (level === 'ready') return 'success'
    if (level === 'attention') return 'warning'
    if (level === 'risk') return 'danger'
    return 'info'
}

/**
 * 检查项状态标签颜色
 */
const resolveCheckTagType = (status: string): ElTagType => {
    if (status === 'pass') return 'success'
    if (status === 'fail') return 'danger'
    if (status === 'warn') return 'warning'
    return 'info'
}

/**
 * 读取许可证信息
 */
const loadLicenseInfo = async () => {
    const data = await uiedLicenseInfo()
    licenseForm.edition = data?.edition || 'free'
    licenseForm.status = data?.status || 'active'
    licenseForm.licenseKey = data?.licenseKey || ''
    licenseForm.customerName = data?.customerName || ''
    licenseForm.companyName = data?.companyName || ''
    licenseForm.contactEmail = data?.contactEmail || ''
    licenseForm.domainLimit = Number(data?.domainLimit || 1)
    licenseForm.issuedAt = Number(data?.issuedAt || 0)
    licenseForm.expiresAt = Number(data?.expiresAt || 0)
    licenseForm.note = data?.note || ''
    domainWhitelistText.value = Array.isArray(data?.domainWhitelist)
        ? data.domainWhitelist.join('\n')
        : ''

    runtimeState.edition = data?.edition || 'free'
    runtimeState.effectiveEdition = data?.effectiveEdition || 'free'
    runtimeState.status = data?.status || 'active'
    runtimeState.isActive = data?.isActive === true
    runtimeState.isExpired = data?.isExpired === true
    runtimeState.now = Number(data?.now || Math.floor(Date.now() / 1000))
    runtimeState.expiresAt = Number(data?.expiresAt || 0)
    runtimeState.runtimeDomain = data?.runtimeDomain || ''
    runtimeState.domainLimit = Number(data?.domainLimit || 1)
    runtimeState.domainUsedCount = Number(data?.domainUsedCount || 0)
    runtimeState.domainRemainingCount = Number(data?.domainRemainingCount || 0)
    runtimeState.domainEnforceEnabled = data?.domainEnforceEnabled === true
    runtimeState.isDomainAuthorized = data?.isDomainAuthorized !== false
    runtimeState.registeredDomains = Array.isArray(data?.registeredDomains)
        ? data.registeredDomains
        : []
}

/**
 * 读取商业版模式配置
 */
const loadCommercialMode = async () => {
    const data = await uiedCommercialModeGet()
    modeForm.strictLegacyRoutes = data?.strictLegacyRoutes === true
    modeForm.enforceLicenseSignature = data?.enforceLicenseSignature === true
    modeForm.enforceDomainBinding = data?.enforceDomainBinding === true
}

/**
 * 读取商业版健康总览
 */
const loadCommercialOverview = async () => {
    try {
        const data = await uiedCommercialOverview()
        overviewState.score = Number(data?.score || 0)
        overviewState.level = data?.level || 'ready'
        overviewState.checks = Array.isArray(data?.checks) ? data.checks : []
    } catch (error) {
        overviewState.score = 0
        overviewState.level = 'ready'
        overviewState.checks = []
    }
}

/**
 * 保存许可证信息
 */
const handleSaveLicense = async () => {
    licenseSaving.value = true
    try {
        await uiedSaveLicenseInfo({
            ...licenseForm,
            domainWhitelist: parseDomainWhitelist()
        })
        feedback.msgSuccess('许可证保存成功')
        await Promise.all([loadLicenseInfo(), loadCommercialOverview()])
    } finally {
        licenseSaving.value = false
    }
}

/**
 * 保存商业版模式配置
 */
const handleSaveMode = async () => {
    modeSaving.value = true
    try {
        await uiedCommercialModeSave({
            strictLegacyRoutes: modeForm.strictLegacyRoutes,
            enforceLicenseSignature: modeForm.enforceLicenseSignature,
            enforceDomainBinding: modeForm.enforceDomainBinding
        })
        feedback.msgSuccess('商业模式保存成功')
        await Promise.all([loadCommercialMode(), loadLicenseInfo(), loadCommercialOverview()])
    } finally {
        modeSaving.value = false
    }
}

/**
 * 页面初始化加载
 */
const initializePage = async () => {
    await Promise.all([loadLicenseInfo(), loadCommercialMode(), loadCommercialOverview()])
}

onMounted(() => {
    initializePage()
})
</script>

<style scoped>
.overview-check-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.overview-check-item {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    line-height: 1.6;
}

.overview-check-text {
    color: var(--el-text-color-regular);
}
</style>
