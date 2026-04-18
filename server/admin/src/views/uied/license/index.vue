<!--
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026.3.24
-->
<template>
    <div class="uied-license-page">
        <el-card class="!border-none mb-4" shadow="never">
            <template #header>
                <div class="flex items-center justify-between">
                    <span class="font-medium">授权运行状态</span>
                    <el-tag :type="runtimeStatusTag">
                        {{ runtimeStatusText }}
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
                    <span>{{ runtimeDomainQuotaDisplay }}</span>
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
                v-if="!runtimeState.isPaidEdition"
                class="mt-4"
                type="warning"
                :closable="false"
                title="当前未激活商业授权，后台功能将受限，请先在下方输入授权码激活。"
            />
            <el-alert
                v-else-if="runtimeState.status === 'inactive'"
                class="mt-4"
                type="error"
                :closable="false"
                :title="runtimeInactiveAlertText"
            />
            <el-alert
                v-else-if="runtimeState.domainEnforceEnabled && !runtimeState.isDomainAuthorized"
                class="mt-4"
                type="error"
                :closable="false"
                :title="runtimeDomainUnauthorizedAlertText"
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
                    <span class="font-medium">授权激活</span>
                    <div class="flex items-center gap-2">
                        <el-button
                            :loading="licenseLoading"
                            @click="handleRefreshLicenseStatus"
                        >
                            刷新状态
                        </el-button>
                        <el-button
                            plain
                            type="primary"
                            tag="a"
                            href="https://fsuied.com/products/10"
                            target="_blank"
                        >
                            购买授权
                        </el-button>
                        <el-button
                            type="primary"
                            :loading="licenseSaving"
                            @click="handleActivateByFile"
                        >
                            文件激活
                        </el-button>
                    </div>
                </div>
            </template>
            <el-alert
                title="请在 fsuied.com 购买后下载授权文件。将授权文件放到服务端 server/licenses/my.license 后，点击“文件激活”即可生效。"
                type="warning"
                :closable="false"
                class="mb-4"
            />

            <el-form label-width="120px" class="max-w-[860px]">
                <el-form-item label="授权文件位置">
                    <el-input value="server/licenses/my.license" disabled />
                    <div class="text-xs text-tx-secondary mt-2">
                        服务器示例：/www/wwwroot/hao.uied.cn/server/licenses/my.license
                    </div>
                </el-form-item>
                <el-form-item label="绑定域名(可选)">
                    <el-input
                        v-model="activateForm.bindDomain"
                        placeholder="可留空，留空默认使用当前访问域名"
                    />
                    <div class="text-xs text-tx-secondary mt-2">
                        当前访问域名：{{ runtimeState.runtimeDomain || '（本地/未识别）' }}
                    </div>
                </el-form-item>
            </el-form>

            <el-descriptions v-if="hasLicensePayload" :column="2" border>
                <el-descriptions-item label="版本等级">
                    {{ resolveEditionText(licenseForm.edition) }}
                </el-descriptions-item>
                <el-descriptions-item label="许可证状态">
                    {{ resolveLicenseStatusText(licenseForm.status) }}
                </el-descriptions-item>
                <el-descriptions-item label="许可证密钥">
                    {{ licenseForm.licenseKey || '未填写' }}
                </el-descriptions-item>
                <el-descriptions-item label="联系邮箱">
                    {{ licenseForm.contactEmail || '未填写' }}
                </el-descriptions-item>
                <el-descriptions-item label="客户名称">
                    {{ licenseForm.customerName || '未填写' }}
                </el-descriptions-item>
                <el-descriptions-item label="公司名称">
                    {{ licenseForm.companyName || '未填写' }}
                </el-descriptions-item>
                <el-descriptions-item label="域名额度">
                    {{ resolveDomainLimitText(licenseForm.domainLimit) }}
                </el-descriptions-item>
                <el-descriptions-item label="到期时间">
                    {{ formatUnixTime(licenseForm.expiresAt) }}
                </el-descriptions-item>
                <el-descriptions-item label="授权域名白名单" :span="2">
                    {{ domainWhitelistDisplay || '暂无' }}
                </el-descriptions-item>
                <el-descriptions-item label="签名状态" :span="2">
                    <el-tag :type="licenseForm.signature ? 'success' : 'danger'">
                        {{ licenseForm.signature ? '签名已生效' : '缺少签名' }}
                    </el-tag>
                </el-descriptions-item>
            </el-descriptions>
        </el-card>

        <el-card class="!border-none" shadow="never">
            <template #header>
                <div class="flex items-center justify-between">
                    <span class="font-medium">请仔细阅读说明</span>
                    <el-tag :type="supportModeTagType">{{ supportModeText }}</el-tag>
                </div>
            </template>
            <el-alert
                title="感谢您使用 UIED 导航系统。授权、改绑、售后均以 fsuied.com 官方渠道为准。"
                type="info"
                :closable="false"
                class="mb-4"
            />

            <el-descriptions :column="2" border>
                <el-descriptions-item label="官网地址">
                    <a :href="supportInfo.siteUrl" target="_blank" rel="noopener noreferrer">
                        {{ supportInfo.siteUrl }}
                    </a>
                </el-descriptions-item>
                <el-descriptions-item label="购买与授权入口">
                    <a :href="supportInfo.productUrl" target="_blank" rel="noopener noreferrer">
                        {{ supportInfo.productUrl }}
                    </a>
                </el-descriptions-item>
                <el-descriptions-item label="客服QQ">
                    {{ supportInfo.qqContact }}
                </el-descriptions-item>
                <el-descriptions-item label="官方QQ群">
                    {{ supportInfo.qqGroup }}
                </el-descriptions-item>
                <el-descriptions-item label="会员号" :span="2">
                    {{ supportMemberDisplay }}
                </el-descriptions-item>
                <el-descriptions-item label="售后截止日期" :span="2">
                    {{ supportDeadlineDisplay }}
                </el-descriptions-item>
            </el-descriptions>

            <div v-if="!isActivatedRuntime" class="license-guide mt-4">
                <h4>未激活专属版</h4>
                <p>
                    当前后台仅开放授权中心页面。请先完成购买、域名绑定与授权激活，激活后后台其余功能自动放行。
                </p>
                <ol>
                    <li>
                        前往
                        <a
                            :href="supportInfo.productUrl"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {{ supportInfo.productUrl }}
                        </a>
                        购买 Pro / Enterprise 授权。
                    </li>
                    <li>在 fsuied.com 授权中心填写部署域名并提交绑定。</li>
                    <li>将 fsuied.com 下发的授权文件放到 <code>server/licenses/my.license</code>。</li>
                    <li>回到当前页面点击“文件激活”，成功后刷新后台。</li>
                    <li>激活成功后刷新后台，即可访问完整后台功能。</li>
                </ol>
                <p>
                    如无法激活或提示禁用，请联系 QQ：{{ supportInfo.qqContact }}（官方群：{{ supportInfo.qqGroup }}）。
                </p>
            </div>

            <div v-else class="license-guide mt-4">
                <h4>已激活专属版</h4>
                <p>
                    主题安装成功。当前系统仅在已授权域名及其子域名可正常使用。如你在官网新增/改绑域名，请先在
                    fsuied.com 完成操作，再回到本页用同一授权码重新激活。
                </p>
                <p class="domain-list-title">当前授权域名：</p>
                <ul>
                    <li v-for="domain in authorizedDomainItems" :key="domain">{{ domain }}</li>
                </ul>
            </div>

            <div class="license-guide mt-4">
                <h4>请仔细阅读说明</h4>
                <p>
                    授权文件包含会员号、域名等关键信息。请勿泄露源码与授权信息，避免对商业权益造成不可逆影响。
                </p>
                <p>
                    请勿将本系统用于违法违规或违反公序良俗的业务场景。若授权被禁用，请联系
                    fsuied.com 官方客服处理。
                </p>
                <p>
                    购买与改绑地址：
                    <a
                        :href="supportInfo.productUrl"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        {{ supportInfo.productUrl }}
                    </a>
                </p>
                <ul>
                    <li>售后支持包含：程序使用咨询、BUG 处理、意见反馈。</li>
                    <li>售后不包含：二次开发、服务器运维、网站优化、环境部署等服务。</li>
                    <li>如需人工支持，请联系 QQ：{{ supportInfo.qqContact }}，QQ群：{{ supportInfo.qqGroup }}。</li>
                </ul>
            </div>
        </el-card>
    </div>
</template>

<script lang="ts" setup name="uiedLicenseCenter">
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026.3.24
 */
import { computed, onMounted, reactive, ref } from 'vue'
import feedback from '@/utils/feedback'
import { uiedActivateLicenseByKey, uiedLicenseInfo } from '@/api/uied'

type ElTagType = '' | 'success' | 'warning' | 'info' | 'danger'
type ElAlertType = 'none' | 'success' | 'warning' | 'info' | 'error'

const licenseSaving = ref(false)
const licenseLoading = ref(false)

const activateForm = reactive({
    bindDomain: ''
})

/**
 * 官方支持信息（激活页固定展示）
 */
const supportInfo = {
    siteUrl: 'https://fsuied.com',
    productUrl: 'https://fsuied.com/products/10',
    qqGroup: '1082794860',
    qqContact: '403479454'
}

const licenseForm = reactive({
    edition: 'free',
    status: 'active',
    licenseKey: '',
    customerName: '',
    companyName: '',
    contactEmail: '',
    domainLimit: 1,
    domainWhitelist: [] as string[],
    issuedAt: 0,
    expiresAt: 0,
    signature: '',
    note: ''
})

const runtimeState = reactive({
    edition: 'free',
    effectiveEdition: 'free',
    status: 'active',
    note: '',
    isActive: false,
    isPaidEdition: false,
    isExpired: false,
    now: 0,
    expiresAt: 0,
    runtimeDomain: '',
    domainLimit: 1,
    domainUsedCount: 0,
    domainRemainingCount: 0,
    domainEnforceEnabled: false,
    isDomainAuthorized: true,
    domainReason: '',
    registeredDomains: [] as string[]
})

const hasLicensePayload = computed(() => {
    return Boolean(
        String(licenseForm.licenseKey || '').trim() || String(licenseForm.signature || '').trim()
    )
})

/**
 * 运行态是否已完成激活（已付费 + 状态正常 + 域名校验通过）
 */
const isActivatedRuntime = computed(() => {
    const status = String(runtimeState.status || '').trim().toLowerCase()
    const isStatusActive = status === 'active'
    const isDomainPass = !runtimeState.domainEnforceEnabled || runtimeState.isDomainAuthorized
    return runtimeState.isPaidEdition && runtimeState.isActive && isStatusActive && isDomainPass
})

/**
 * 说明区模式文案
 */
const supportModeText = computed(() => {
    return isActivatedRuntime.value ? '已激活专属版' : '未激活专属版'
})

/**
 * 说明区模式标签颜色
 */
const supportModeTagType = computed<ElTagType>(() => {
    return isActivatedRuntime.value ? 'success' : 'warning'
})

/**
 * 授权域名白名单展示文本
 */
const domainWhitelistDisplay = computed(() => licenseForm.domainWhitelist.join('、'))

/**
 * 会员号展示文案（优先客户名，其次邮箱）
 */
const supportMemberDisplay = computed(() => {
    if (!isActivatedRuntime.value) {
        return '未激活（激活后显示会员信息）'
    }
    const customerName = String(licenseForm.customerName || '').trim()
    if (customerName) {
        return customerName
    }
    const contactEmail = String(licenseForm.contactEmail || '').trim()
    if (contactEmail) {
        return contactEmail
    }
    return '请在 fsuied.com 用户中心查看'
})

/**
 * 售后截止日期展示文案
 */
const supportDeadlineDisplay = computed(() => {
    if (!isActivatedRuntime.value) {
        return '未激活（激活后显示售后截止日期）'
    }
    if (!licenseForm.expiresAt || licenseForm.expiresAt <= 0) {
        return '长期有效（售后期限以 fsuied.com 订单显示为准）'
    }
    return `${formatUnixTime(licenseForm.expiresAt)}（以 fsuied.com 订单显示为准）`
})

/**
 * 授权域名列表展示（无数据时给出引导文案）
 */
const authorizedDomainItems = computed(() => {
    const domains = runtimeState.registeredDomains.filter((item) => String(item || '').trim())
    if (domains.length > 0) {
        return domains
    }
    return ['暂未登记授权域名，请先在 fsuied.com 绑定域名后重新激活']
})

/**
 * 将授权载荷写入表单
 */
const applyLicensePayloadToForm = (payload: Record<string, any>) => {
    licenseForm.edition = String(payload.edition || 'free')
        .trim()
        .toLowerCase()
    licenseForm.status = String(payload.status || 'active')
        .trim()
        .toLowerCase()
    licenseForm.licenseKey = String(payload.licenseKey || '').trim()
    licenseForm.customerName = String(payload.customerName || '').trim()
    licenseForm.companyName = String(payload.companyName || '').trim()
    licenseForm.contactEmail = String(payload.contactEmail || '').trim()
    licenseForm.domainLimit = Number(payload.domainLimit || 1)
    licenseForm.issuedAt = Number(payload.issuedAt || 0)
    licenseForm.expiresAt = Number(payload.expiresAt || 0)
    licenseForm.signature = String(payload.signature || '').trim()
    licenseForm.note = String(payload.note || '').trim()

    const whitelist = Array.isArray(payload.domainWhitelist)
        ? payload.domainWhitelist.map((item: any) => String(item || '').trim()).filter(Boolean)
        : []
    licenseForm.domainWhitelist = whitelist
}

/**
 * 读取许可证信息
 */
const loadLicenseInfo = async () => {
    const data = await uiedLicenseInfo()
    applyLicensePayloadToForm(data || {})

    runtimeState.edition = data?.edition || 'free'
    runtimeState.effectiveEdition = data?.effectiveEdition || 'free'
    runtimeState.status = data?.status || 'active'
    runtimeState.note = String(data?.note || '').trim()
    runtimeState.isActive = data?.isActive === true
    runtimeState.isPaidEdition = data?.isPaidEdition === true
    runtimeState.isExpired = data?.isExpired === true
    runtimeState.now = Number(data?.now || Math.floor(Date.now() / 1000))
    runtimeState.expiresAt = Number(data?.expiresAt || 0)
    runtimeState.runtimeDomain = data?.runtimeDomain || ''
    runtimeState.domainLimit = Number(data?.domainLimit || 1)
    runtimeState.domainUsedCount = Number(data?.domainUsedCount || 0)
    runtimeState.domainRemainingCount = Number(data?.domainRemainingCount || 0)
    runtimeState.domainEnforceEnabled = data?.domainEnforceEnabled === true
    runtimeState.isDomainAuthorized = data?.isDomainAuthorized !== false
    runtimeState.domainReason = String(data?.domainReason || '').trim()
    runtimeState.registeredDomains = Array.isArray(data?.registeredDomains)
        ? data.registeredDomains
        : []
    if (
        !String(activateForm.bindDomain || '').trim() &&
        String(runtimeState.runtimeDomain || '').trim()
    ) {
        activateForm.bindDomain = String(runtimeState.runtimeDomain || '').trim()
    }
}

/**
 * 手动刷新授权状态
 */
const handleRefreshLicenseStatus = async () => {
    licenseLoading.value = true
    try {
        await loadLicenseInfo()
        feedback.msgSuccess('授权状态已刷新')
    } finally {
        licenseLoading.value = false
    }
}

/**
 * 提取请求失败文案（兜底空异常，避免 Uncaught (in promise) <empty string>）
 */
const resolveRequestErrorMessage = (error: any, fallback = '操作失败，请稍后重试') => {
    const directText = typeof error === 'string' ? error.trim() : ''
    if (directText) return directText
    const messageList = [
        error?.message,
        error?.msg,
        error?.data?.message,
        error?.data?.msg,
        error?.response?.data?.message,
        error?.response?.data?.msg
    ]
        .map((item: unknown) => String(item || '').trim())
        .filter(Boolean)
    if (messageList.length > 0) return messageList[0]
    return String(fallback || '操作失败，请稍后重试').trim()
}

/**
 * 规范化授权激活错误文案
 */
const resolveActivateErrorMessage = (error: any) => {
    const code = Number(error?.code || error?.response?.data?.code || 0)
    const rawMessage = resolveRequestErrorMessage(error, '授权激活失败，请稍后重试')
    const normalizedMessage = String(rawMessage || '').trim()
    const bindDomain = String(activateForm.bindDomain || runtimeState.runtimeDomain || '').trim()
    const domainMismatchByCode = code === 41002
    const domainMismatchByText = /域名不匹配|未在授权白名单|domain[_\s-]?not[_\s-]?bound|domain_not_authorized/i.test(
        normalizedMessage
    )
    if (domainMismatchByCode || domainMismatchByText) {
        if (bindDomain) {
            return `授权与域名不匹配：${bindDomain} 未在当前授权白名单，请到 fsuied.com 完成域名绑定后重试`
        }
        return '授权与域名不匹配：当前域名未在授权白名单，请到 fsuied.com 完成域名绑定后重试'
    }
    const projectMismatchByCode = code === 41003
    const projectMismatchByText = /项目不匹配|project[_\s-]?mismatch/i.test(normalizedMessage)
    if (projectMismatchByCode || projectMismatchByText) {
        return '授权码与当前项目不匹配，请确认项目编码为 fsuied 后重试'
    }
    const isQuotaExceeded =
        code === 41005 || /额度已满|域名额度|已超限|domain_limit_exceeded/i.test(normalizedMessage)
    if (isQuotaExceeded) {
        const used = Math.max(0, Number(runtimeState.domainUsedCount || 0))
        const limit = Math.max(0, Number(runtimeState.domainLimit || 0))
        if (limit > 0) {
            return `授权域名额度已满（${used}/${limit}），请先在 fsuied.com 更换或释放已绑定域名后重试`
        }
        return '授权域名额度已满，请先在 fsuied.com 更换或释放已绑定域名后重试'
    }
    return normalizedMessage
}

/**
 * 通过本地授权文件激活授权
 */
const handleActivateByFile = async () => {
    licenseSaving.value = true
    try {
        await uiedActivateLicenseByKey({
            bindDomain: String(activateForm.bindDomain || '').trim()
        })
        feedback.msgSuccess('授权文件激活成功')
        await loadLicenseInfo()
    } catch (error) {
        if ((error as any)?.__uiedHandled === true) return
        feedback.msgError(resolveActivateErrorMessage(error))
    } finally {
        licenseSaving.value = false
    }
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
 * 解析版本文案
 */
const resolveEditionText = (edition: string) => {
    const text = String(edition || '').toLowerCase()
    if (text === 'enterprise') return 'Enterprise'
    if (text === 'pro') return 'Pro'
    return '未激活'
}

/**
 * 解析域名额度文案
 */
const resolveDomainLimitText = (domainLimit: number) => {
    if (Number(domainLimit || 0) >= 9999) {
        return '不限制（Enterprise）'
    }
    return `${Number(domainLimit || 0)} 个`
}

/**
 * 运行态域名额度展示（已用/总额）
 * 例如：1/3（已用/总额）
 */
const runtimeDomainQuotaDisplay = computed(() => {
    const used = Math.max(0, Number(runtimeState.domainUsedCount || 0))
    const limit = Math.max(0, Number(runtimeState.domainLimit || 0))
    if (limit >= 9999) {
        return `${used}/∞（已用/总额）`
    }
    return `${used}/${limit || 0}（已用/总额）`
})

/**
 * 授权禁用态提示文案（支持 fsuied 回传 note）
 */
const runtimeInactiveAlertText = computed(() => {
    const reason = String(runtimeState.note || '').trim()
    if (!reason) {
        return '当前授权已被禁用，请在 fsuied.com 处理后重新激活授权。'
    }
    return `当前授权已被禁用：${reason}，请在 fsuied.com 处理后重新激活授权。`
})

/**
 * 域名未授权提示文案（区分“超限”和“未在白名单”）
 */
const runtimeDomainUnauthorizedAlertText = computed(() => {
    const reason = String(runtimeState.domainReason || '').trim().toLowerCase()
    if (reason === 'domain_not_in_whitelist') {
        return '当前域名未在授权白名单，请先在 fsuied.com 绑定该域名后，回到本页重新激活授权。'
    }
    return '当前域名未授权：已超过域名绑定上限，请在 fsuied.com 申请改绑后重新激活授权。'
})

/**
 * 授权状态对应标签颜色
 */
const resolveLicenseStatusTag = (status: string): ElTagType => {
    if (status === 'active') return 'success'
    if (['invalid_signature', 'domain_limit_exceeded', 'domain_not_authorized'].includes(status)) return 'danger'
    if (['inactive', 'disabled'].includes(status)) return 'warning'
    return 'info'
}

/**
 * 授权状态对应文案
 */
const resolveLicenseStatusText = (status: string) => {
    if (status === 'active') return '已激活'
    if (status === 'invalid_signature') return '签名无效'
    if (status === 'domain_limit_exceeded') return '域名超限'
    if (status === 'domain_not_authorized') return '域名未授权'
    if (status === 'inactive') return '已禁用'
    if (status === 'disabled') return '已禁用'
    return status || '未知'
}

/**
 * 运行状态标签颜色：未激活时优先显示“待激活”
 */
const runtimeStatusTag = computed<ElTagType>(() => {
    if (!runtimeState.isPaidEdition) return 'warning'
    return resolveLicenseStatusTag(runtimeState.status)
})

/**
 * 运行状态文案：未激活时优先显示“待激活”
 */
const runtimeStatusText = computed(() => {
    if (!runtimeState.isPaidEdition) return '待激活'
    return resolveLicenseStatusText(runtimeState.status)
})

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
            alertText: '许可证已过期，请在 fsuied.com 续期后重新激活授权。'
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
 * 页面初始化加载
 */
const initializePage = async () => {
    licenseLoading.value = true
    try {
        await loadLicenseInfo()
    } finally {
        licenseLoading.value = false
    }
}

onMounted(() => {
    initializePage()
})
</script>

<style scoped>
.uied-license-page {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.license-guide {
    border: 1px solid var(--el-border-color-light);
    border-radius: 8px;
    padding: 12px 14px;
    background: var(--el-fill-color-lighter);
}

.license-guide h4 {
    margin: 0 0 8px 0;
    font-size: 14px;
    font-weight: 600;
}

.license-guide p {
    margin: 0 0 8px 0;
    line-height: 1.7;
    color: var(--el-text-color-primary);
}

.license-guide .domain-list-title {
    margin-top: 10px;
    margin-bottom: 6px;
    font-weight: 500;
}

.license-guide ul {
    margin: 0;
    padding-left: 18px;
}

.license-guide ol {
    margin: 0;
    padding-left: 18px;
}

.license-guide li {
    margin-bottom: 6px;
    line-height: 1.6;
    color: var(--el-text-color-secondary);
}

.license-guide li:last-child {
    margin-bottom: 0;
}
</style>
