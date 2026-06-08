<!--
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026.2.20
-->
<template>
    <div class="uied-delivery-init-page">
        <el-card class="!border-none" shadow="never">
            <template #header>
                <div class="flex items-center justify-between">
                    <span class="font-medium">交付初始化向导</span>
                    <div class="flex gap-2">
                        <el-button
                            v-perms="['uied:delivery:profile:save']"
                            @click="handleOpenProfileManage"
                        >
                            模板管理
                        </el-button>
                        <el-button
                            v-perms="['uied:delivery:package:export']"
                            :loading="exportLoading"
                            @click="handleExportPackage"
                        >
                            导出客户包
                        </el-button>
                        <el-button :loading="doctorLoading" @click="handleDoctorCheck">
                            发布自检
                        </el-button>
                        <el-button :loading="previewLoading" @click="handlePreview"
                            >刷新预览</el-button
                        >
                        <el-button type="primary" :loading="executeLoading" @click="handleExecute">
                            执行初始化
                        </el-button>
                    </div>
                </div>
            </template>
            <el-alert
                title="说明：用于售卖版交付时一键导入站点配置、分类标签、示例数据，并可按授权码激活许可证。建议先预览再执行。"
                type="info"
                :closable="false"
                class="mb-4"
            />
            <div class="delivery-doctor-panel">
                <div class="delivery-doctor-panel__header">
                    <div>
                        <div class="delivery-doctor-panel__eyebrow">Release Doctor</div>
                        <div class="delivery-doctor-panel__title">客户交付发布自检</div>
                        <div class="delivery-doctor-panel__desc">
                            检查运行环境、授权状态、数据库关键表、基础配置、上传目录与发布文件，不会写入数据库。
                        </div>
                    </div>
                    <div class="delivery-doctor-panel__summary">
                        <div
                            class="delivery-doctor-panel__score"
                            :class="`is-${doctorSummary.level || 'unknown'}`"
                        >
                            {{ doctorSummary.score ?? '--' }}
                        </div>
                        <div class="delivery-doctor-panel__summary-text">
                            <span>通过 {{ doctorSummary.pass ?? 0 }}</span>
                            <span>警告 {{ doctorSummary.warn ?? 0 }}</span>
                            <span>失败 {{ doctorSummary.fail ?? 0 }}</span>
                        </div>
                    </div>
                </div>
                <div v-if="doctorData" class="delivery-doctor-panel__body">
                    <div class="delivery-doctor-panel__meta">
                        <span>版本：{{ doctorData?.environment?.version || '-' }}</span>
                        <span
                            >环境：{{
                                doctorData?.environment?.eggEnv ||
                                doctorData?.environment?.nodeEnv ||
                                '-'
                            }}</span
                        >
                        <span>上传目录：{{ doctorData?.environment?.uploadsDir || '-' }}</span>
                    </div>
                    <el-collapse class="delivery-doctor-panel__collapse">
                        <el-collapse-item
                            v-for="group in groupedDoctorChecks"
                            :key="group.key"
                            :name="group.key"
                        >
                            <template #title>
                                <div class="delivery-doctor-panel__group-title">
                                    <span>{{ group.label }}</span>
                                    <el-tag size="small" type="success"
                                        >通过 {{ group.pass }}</el-tag
                                    >
                                    <el-tag size="small" type="warning"
                                        >警告 {{ group.warn }}</el-tag
                                    >
                                    <el-tag size="small" type="danger"
                                        >失败 {{ group.fail }}</el-tag
                                    >
                                </div>
                            </template>
                            <div class="delivery-doctor-panel__checks">
                                <div
                                    v-for="item in group.items"
                                    :key="item.key"
                                    class="delivery-doctor-panel__check"
                                >
                                    <el-tag
                                        :type="getDoctorStatusTagType(item.status)"
                                        size="small"
                                    >
                                        {{ getDoctorStatusLabel(item.status) }}
                                    </el-tag>
                                    <div class="delivery-doctor-panel__check-main">
                                        <div class="delivery-doctor-panel__check-title">
                                            {{ item.title }}
                                        </div>
                                        <div class="delivery-doctor-panel__check-message">
                                            {{ item.message }}
                                        </div>
                                        <div
                                            v-if="item.suggestion"
                                            class="delivery-doctor-panel__check-suggestion"
                                        >
                                            建议：{{ item.suggestion }}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </el-collapse-item>
                    </el-collapse>
                    <div class="delivery-doctor-panel__commands">
                        <div>服务器命令：{{ doctorData?.commands?.backend || '-' }}</div>
                        <div>初始化 SQL：{{ doctorData?.commands?.starterSql || '-' }}</div>
                    </div>
                </div>
                <el-empty v-else description="点击“发布自检”检查当前交付环境" />
            </div>
            <el-form :model="formData" label-width="150px" class="max-w-[980px]">
                <el-form-item label="初始化模板">
                    <div class="delivery-profile-selector">
                        <el-select
                            v-model="formData.profile"
                            class="w-[320px]"
                            filterable
                            :loading="profileLoading"
                            placeholder="请选择初始化模板"
                        >
                            <el-option
                                v-for="item in profileOptions"
                                :key="item.key"
                                :label="item.name"
                                :value="item.key"
                            />
                        </el-select>
                        <div class="delivery-profile-tip">
                            推荐按交付场景选择模板，模板会影响默认站点配置、分类、标签与示例数据。
                        </div>
                    </div>
                </el-form-item>
                <el-form-item label="模板卡片">
                    <div class="delivery-profile-grid">
                        <button
                            v-for="item in profileOptions"
                            :key="item.key"
                            type="button"
                            class="delivery-profile-card"
                            :class="{ 'is-active': formData.profile === item.key }"
                            @click="handleSelectProfile(item)"
                        >
                            <div class="card-title">{{ item.name }}</div>
                            <div class="card-description">{{ item.description || '暂无说明' }}</div>
                            <div class="card-meta">
                                推荐版本：{{
                                    String(item.recommendedEdition || 'pro').toUpperCase()
                                }}
                            </div>
                        </button>
                    </div>
                </el-form-item>
                <el-form-item label="版本等级">
                    <el-select v-model="formData.edition" class="w-[220px]">
                        <el-option label="Pro" value="pro" />
                        <el-option label="Enterprise" value="enterprise" />
                    </el-select>
                </el-form-item>
                <el-form-item label="品牌名称">
                    <el-input v-model="formData.brandName" placeholder="站点品牌名称" />
                </el-form-item>
                <el-form-item label="品牌域名">
                    <el-input v-model="formData.brandDomain" placeholder="https://example.com" />
                </el-form-item>
                <el-form-item label="客户名称">
                    <el-input v-model="formData.customerName" placeholder="可选" />
                </el-form-item>
                <el-form-item label="公司名称">
                    <el-input v-model="formData.companyName" placeholder="可选" />
                </el-form-item>
                <el-form-item label="联系邮箱">
                    <el-input v-model="formData.contactEmail" placeholder="可选" />
                </el-form-item>
                <el-form-item label="授权码 Key">
                    <el-input
                        v-model="formData.licenseKey"
                        placeholder="请输入 fsuied.com 下发的授权码（例如 UIED-PRO-XXXX-XXXX）"
                    />
                </el-form-item>
                <el-form-item label="绑定域名(可选)">
                    <el-input
                        v-model="formData.bindDomain"
                        placeholder="留空默认使用当前访问域名"
                    />
                </el-form-item>
            </el-form>
        </el-card>

        <el-card class="!border-none mt-4" shadow="never">
            <template #header>
                <div class="font-medium">导入模块</div>
            </template>
            <el-form :model="formData" label-width="180px" class="max-w-[980px]">
                <el-form-item label="站点配置">
                    <el-switch v-model="formData.includeSiteSettings" />
                </el-form-item>
                <el-form-item label="网站分类">
                    <el-switch v-model="formData.includeWebsiteCategories" />
                </el-form-item>
                <el-form-item label="网站标签">
                    <el-switch v-model="formData.includeWebsiteTags" />
                </el-form-item>
                <el-form-item label="示例网站">
                    <el-switch v-model="formData.includeSampleWebsites" />
                </el-form-item>
                <el-form-item label="文章分类">
                    <el-switch v-model="formData.includeArticleCategories" />
                </el-form-item>
                <el-form-item label="文章标签">
                    <el-switch v-model="formData.includeArticleTags" />
                </el-form-item>
                <el-form-item label="示例文章">
                    <el-switch v-model="formData.includeSampleArticles" />
                </el-form-item>
                <el-form-item label="激活授权码">
                    <el-switch v-model="formData.applyLicense" />
                </el-form-item>
                <el-form-item label="初始化测试用户">
                    <el-switch v-model="formData.seedUsers" />
                </el-form-item>
                <el-form-item label="清空功能开关覆盖">
                    <el-switch v-model="formData.resetFeatureOverrides" />
                </el-form-item>
                <el-form-item label="功能开关覆盖(JSON)">
                    <el-input
                        v-model="featureOverridesText"
                        :disabled="formData.resetFeatureOverrides"
                        type="textarea"
                        :rows="6"
                        placeholder='{"ai_chat": false, "advanced_stats": true}'
                        class="font-mono"
                    />
                </el-form-item>
            </el-form>
        </el-card>

        <el-card class="!border-none mt-4" shadow="never">
            <template #header>
                <div class="font-medium">预览结果</div>
            </template>
            <template v-if="previewData">
                <el-descriptions :column="2" border>
                    <el-descriptions-item label="模板">{{
                        previewData.profileName || previewData.profile || '-'
                    }}</el-descriptions-item>
                    <el-descriptions-item label="版本">{{
                        String(previewData.edition || '-').toUpperCase()
                    }}</el-descriptions-item>
                    <el-descriptions-item label="网站分类数量">{{
                        previewData?.counts?.websiteCategories ?? 0
                    }}</el-descriptions-item>
                    <el-descriptions-item label="网站标签数量">{{
                        previewData?.counts?.websiteTags ?? 0
                    }}</el-descriptions-item>
                    <el-descriptions-item label="示例网站数量">{{
                        previewData?.counts?.sampleWebsites ?? 0
                    }}</el-descriptions-item>
                    <el-descriptions-item label="示例文章数量">{{
                        previewData?.counts?.sampleArticles ?? 0
                    }}</el-descriptions-item>
                </el-descriptions>
                <el-alert
                    class="mt-3"
                    type="success"
                    :closable="false"
                    :title="`启用模块：${
                        renderEnabledModules(previewData?.modules || {}).join(' / ') || '无'
                    }`"
                />
            </template>
            <el-empty v-else description="点击“刷新预览”生成导入预览" />
        </el-card>

        <el-card class="!border-none mt-4" shadow="never">
            <template #header>
                <div class="font-medium">执行结果</div>
            </template>
            <template v-if="executeResult">
                <el-descriptions :column="2" border>
                    <el-descriptions-item label="模板">{{
                        executeResult.profileName || executeResult.profile || '-'
                    }}</el-descriptions-item>
                    <el-descriptions-item label="版本">{{
                        String(executeResult.edition || '-').toUpperCase()
                    }}</el-descriptions-item>
                    <el-descriptions-item label="站点配置">
                        {{ executeResult?.summary?.siteSettings?.saved ? '已写入' : '未写入' }}
                    </el-descriptions-item>
                    <el-descriptions-item label="授权激活">
                        {{ executeResult?.summary?.license?.applied ? '已激活' : '未激活' }}
                    </el-descriptions-item>
                    <el-descriptions-item label="网站分类">
                        新增 {{ executeResult?.summary?.websiteCategories?.created ?? 0 }} / 更新
                        {{ executeResult?.summary?.websiteCategories?.updated ?? 0 }}
                    </el-descriptions-item>
                    <el-descriptions-item label="网站标签">
                        新增 {{ executeResult?.summary?.websiteTags?.created ?? 0 }} / 更新
                        {{ executeResult?.summary?.websiteTags?.updated ?? 0 }}
                    </el-descriptions-item>
                    <el-descriptions-item label="示例网站">
                        新增 {{ executeResult?.summary?.sampleWebsites?.created ?? 0 }} / 更新
                        {{ executeResult?.summary?.sampleWebsites?.updated ?? 0 }}
                    </el-descriptions-item>
                    <el-descriptions-item label="示例文章">
                        新增 {{ executeResult?.summary?.sampleArticles?.created ?? 0 }} / 更新
                        {{ executeResult?.summary?.sampleArticles?.updated ?? 0 }}
                    </el-descriptions-item>
                    <el-descriptions-item label="测试用户初始化">
                        {{
                            executeResult?.summary?.users?.seeded
                                ? `已执行（${executeResult?.summary?.users?.total ?? 0}）`
                                : '未执行'
                        }}
                    </el-descriptions-item>
                </el-descriptions>
            </template>
            <el-empty v-else description="尚未执行初始化" />
        </el-card>

        <el-dialog v-model="profileManageVisible" title="模板库管理" width="920px" destroy-on-close>
            <el-alert
                title="说明：仅管理模板展示信息与启用状态，不影响模板内置的数据结构。"
                type="info"
                :closable="false"
                class="mb-3"
            />
            <div class="mb-3 flex items-center justify-between">
                <div class="text-[12px] text-[#909399]">
                    自定义模板键仅支持：小写字母、数字、下划线和中划线。
                </div>
                <el-button type="primary" plain @click="handleAddProfileRow">新增模板</el-button>
            </div>
            <el-table :data="profileManageRows" border>
                <el-table-column label="模板键" min-width="180">
                    <template #default="{ row }">
                        <el-input v-model="row.key" :disabled="row.builtin" maxlength="40" />
                    </template>
                </el-table-column>
                <el-table-column label="模板名称" min-width="160">
                    <template #default="{ row }">
                        <el-input v-model="row.name" maxlength="40" />
                    </template>
                </el-table-column>
                <el-table-column label="模板说明" min-width="240">
                    <template #default="{ row }">
                        <el-input v-model="row.description" maxlength="120" />
                    </template>
                </el-table-column>
                <el-table-column label="推荐版本" width="130">
                    <template #default="{ row }">
                        <el-select v-model="row.recommendedEdition">
                            <el-option label="Pro" value="pro" />
                            <el-option label="Enterprise" value="enterprise" />
                        </el-select>
                    </template>
                </el-table-column>
                <el-table-column label="基座模板" width="150">
                    <template #default="{ row }">
                        <el-select v-model="row.baseProfile">
                            <el-option
                                v-for="base in baseProfileOptions"
                                :key="base.key"
                                :label="base.name"
                                :value="base.key"
                            />
                        </el-select>
                    </template>
                </el-table-column>
                <el-table-column label="排序" width="110">
                    <template #default="{ row }">
                        <el-input-number v-model="row.sort" :min="0" :max="9999" />
                    </template>
                </el-table-column>
                <el-table-column label="启用" width="90" align="center">
                    <template #default="{ row }">
                        <el-switch v-model="row.enabled" />
                    </template>
                </el-table-column>
                <el-table-column label="操作" width="90" align="center">
                    <template #default="{ $index }">
                        <el-button link type="danger" @click="handleDeleteProfileRow($index)"
                            >删除</el-button
                        >
                    </template>
                </el-table-column>
            </el-table>
            <template #footer>
                <div class="flex justify-between items-center">
                    <el-button @click="handleRestoreProfileDefaults">恢复默认模板库</el-button>
                    <div class="flex gap-2">
                        <el-button @click="profileManageVisible = false">取消</el-button>
                        <el-button
                            type="primary"
                            :loading="profileManageSaving"
                            @click="handleSaveProfileManage"
                        >
                            保存模板配置
                        </el-button>
                    </div>
                </div>
            </template>
        </el-dialog>
    </div>
</template>

<script lang="ts" setup name="uiedDeliveryInit">
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026.2.20
 */
import { computed, onMounted, reactive, ref } from 'vue'
import feedback from '@/utils/feedback'
import {
    uiedDeliveryInitDoctor,
    uiedDeliveryProfileManageList,
    uiedDeliveryProfileList,
    uiedDeliveryProfileSave,
    uiedDeliveryInitExecute,
    uiedDeliveryInitPreview,
    uiedDeliveryPackageExport
} from '@/api/uied'

const profileLoading = ref(false)
const profileManageVisible = ref(false)
const profileManageSaving = ref(false)
const previewLoading = ref(false)
const executeLoading = ref(false)
const exportLoading = ref(false)
const doctorLoading = ref(false)
const featureOverridesText = ref('{}')
const previewData = ref<any>(null)
const executeResult = ref<any>(null)
const doctorData = ref<any>(null)
const profileOptions = ref<any[]>([])
const profileManageRows = ref<any[]>([])
const baseProfileOptions = ref<any[]>([])

const doctorGroupLabels: Record<string, string> = {
    runtime: '运行环境',
    license: '授权校验',
    database: '数据库表',
    config: '基础配置',
    files: '发布文件'
}

const doctorSummary = computed(() => {
    return (
        doctorData.value?.summary || {
            pass: 0,
            warn: 0,
            fail: 0,
            total: 0,
            score: null,
            level: 'unknown'
        }
    )
})

/**
 * 按分组整理发布自检结果，便于后台折叠查看。
 */
const groupedDoctorChecks = computed(() => {
    const checks = Array.isArray(doctorData.value?.checks) ? doctorData.value.checks : []
    const groupMap = new Map<string, any>()
    checks.forEach((item: any) => {
        const key = String(item?.group || 'other')
        if (!groupMap.has(key)) {
            groupMap.set(key, {
                key,
                label: doctorGroupLabels[key] || key,
                items: [],
                pass: 0,
                warn: 0,
                fail: 0
            })
        }
        const group = groupMap.get(key)
        group.items.push(item)
        if (item?.status === 'pass') group.pass += 1
        if (item?.status === 'warn') group.warn += 1
        if (item?.status === 'fail') group.fail += 1
    })
    const order = ['runtime', 'license', 'database', 'config', 'files']
    return Array.from(groupMap.values()).sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key))
})

const formData = reactive({
    profile: 'commercial_default',
    edition: 'pro',
    brandName: 'UIED 商业导航系统',
    brandDomain: '',
    customerName: '',
    companyName: '',
    contactEmail: '',
    licenseKey: '',
    bindDomain: '',
    includeSiteSettings: true,
    includeWebsiteCategories: true,
    includeWebsiteTags: true,
    includeSampleWebsites: true,
    includeArticleCategories: true,
    includeArticleTags: true,
    includeSampleArticles: true,
    applyLicense: true,
    resetFeatureOverrides: true,
    seedUsers: true
})

/**
 * 生成交付模板目录默认值（接口异常时兜底）
 */
const getDefaultProfileOptions = () => {
    return [
        {
            key: 'commercial_default',
            baseProfile: 'commercial_default',
            builtin: true,
            name: '商业交付默认模板',
            description: '通用商业导航模板，适合标准售卖交付。',
            recommendedEdition: 'pro',
            sort: 10,
            enabled: true
        },
        {
            key: 'ai_navigation',
            baseProfile: 'ai_navigation',
            builtin: true,
            name: 'AI 导航模板',
            description: '偏 AI 工具聚合场景，强调 AI 搜索与效率工具。',
            recommendedEdition: 'pro',
            sort: 20,
            enabled: true
        },
        {
            key: 'design_navigation',
            baseProfile: 'design_navigation',
            builtin: true,
            name: '设计导航模板',
            description: '偏 UI/UX 与灵感素材场景，强化设计分类与标签。',
            recommendedEdition: 'pro',
            sort: 30,
            enabled: true
        },
        {
            key: 'tools_navigation',
            baseProfile: 'tools_navigation',
            builtin: true,
            name: '工具导航模板',
            description: '偏效率与开发工具场景，适合通用工具站售卖。',
            recommendedEdition: 'pro',
            sort: 40,
            enabled: true
        }
    ]
}

/**
 * 规范化模板目录数据，确保页面渲染结构稳定
 */
const normalizeProfileOptions = (list: any[]) => {
    const defaultList = getDefaultProfileOptions()
    const baseProfileKeySet = new Set(defaultList.map((item) => String(item.key)))
    const sanitizeKey = (value: any) =>
        String(value || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_-]/g, '')
            .slice(0, 40)
    const normalizeEdition = (value: any) => {
        const text = String(value || '')
            .trim()
            .toLowerCase()
        return text === 'enterprise' ? 'enterprise' : 'pro'
    }
    return (Array.isArray(list) ? list : [])
        .map((item, index) => ({
            key: sanitizeKey(item?.key),
            name: String(item?.name || item?.key || '')
                .trim()
                .slice(0, 40),
            description: String(item?.description || '').trim(),
            recommendedEdition: normalizeEdition(item?.recommendedEdition),
            sort: Number.isFinite(Number(item?.sort)) ? Number(item.sort) : (index + 1) * 10,
            enabled: item?.enabled !== false,
            baseProfile: baseProfileKeySet.has(sanitizeKey(item?.baseProfile))
                ? sanitizeKey(item?.baseProfile)
                : 'commercial_default',
            builtin: item?.builtin === true
        }))
        .filter((item) => item.key)
        .sort((a, b) => a.sort - b.sort)
}

/**
 * 获取基座模板选项（只允许映射到内置模板）
 */
const getBaseProfileOptions = () => {
    return getDefaultProfileOptions().map((item) => ({
        key: String(item.key),
        name: String(item.name)
    }))
}

/**
 * 刷新“基座模板”下拉选项
 */
const refreshBaseProfileOptions = () => {
    baseProfileOptions.value = getBaseProfileOptions()
}

/**
 * 生成一个新的自定义模板默认行
 */
const createCustomProfileRow = (index: number) => {
    return {
        key: `custom_profile_${index}`,
        name: `自定义模板 ${index}`,
        description: '',
        recommendedEdition: 'pro',
        sort: 100 + index * 10,
        enabled: true,
        baseProfile: 'commercial_default',
        builtin: false
    }
}

/**
 * 加载交付模板目录
 */
const loadProfileOptions = async () => {
    profileLoading.value = true
    try {
        const list = await uiedDeliveryProfileList()
        const normalized = normalizeProfileOptions(
            Array.isArray(list) && list.length > 0 ? list : getDefaultProfileOptions()
        )
        profileOptions.value = normalized
        refreshBaseProfileOptions()
        const exists = normalized.some(
            (item: any) => String(item?.key || '') === String(formData.profile)
        )
        if (!exists && normalized[0]?.key) {
            formData.profile = String(normalized[0].key)
        }
    } catch (_error) {
        profileOptions.value = normalizeProfileOptions(getDefaultProfileOptions())
    } finally {
        profileLoading.value = false
    }
}

/**
 * 加载模板库管理数据
 */
const loadProfileManageRows = async () => {
    try {
        const list = await uiedDeliveryProfileManageList()
        const normalized = normalizeProfileOptions(
            Array.isArray(list) && list.length > 0 ? list : getDefaultProfileOptions()
        )
        profileManageRows.value = normalized.map((item) => ({ ...item }))
        refreshBaseProfileOptions()
    } catch (_error) {
        profileManageRows.value = normalizeProfileOptions(getDefaultProfileOptions())
        refreshBaseProfileOptions()
    }
}

/**
 * 打开模板库管理弹窗
 */
const handleOpenProfileManage = async () => {
    profileManageVisible.value = true
    await loadProfileManageRows()
}

/**
 * 新增模板行（用于创建自定义模板）
 */
const handleAddProfileRow = () => {
    const nextIndex = profileManageRows.value.length + 1
    profileManageRows.value.push(createCustomProfileRow(nextIndex))
}

/**
 * 删除模板行
 */
const handleDeleteProfileRow = (index: number) => {
    profileManageRows.value.splice(index, 1)
}

/**
 * 恢复模板库默认配置
 */
const handleRestoreProfileDefaults = async () => {
    try {
        await feedback.confirm('恢复后会覆盖当前模板库名称/说明/排序/启用状态，是否继续？')
    } catch (_error) {
        return
    }
    profileManageRows.value = normalizeProfileOptions(getDefaultProfileOptions()).map((item) => ({
        ...item
    }))
    refreshBaseProfileOptions()
}

/**
 * 保存模板库配置
 */
const handleSaveProfileManage = async () => {
    const profileKeyPattern = /^[a-z0-9_-]{1,40}$/
    const list = normalizeProfileOptions(profileManageRows.value).map((item) => ({
        key: item.key,
        name: item.name,
        description: item.description,
        recommendedEdition: item.recommendedEdition,
        sort: item.sort,
        enabled: item.enabled,
        baseProfile: item.baseProfile
    }))
    if (!list.length) {
        feedback.msgError('模板库不能为空')
        return
    }
    const keySet = new Set<string>()
    for (const item of list) {
        if (!profileKeyPattern.test(item.key)) {
            feedback.msgError(`模板键不合法：${item.key}`)
            return
        }
        if (keySet.has(item.key)) {
            feedback.msgError(`模板键重复：${item.key}`)
            return
        }
        keySet.add(item.key)
    }
    if (!list.some((item) => item.enabled)) {
        feedback.msgError('至少需要启用一个模板')
        return
    }
    profileManageSaving.value = true
    try {
        await uiedDeliveryProfileSave({ list })
        feedback.msgSuccess('模板配置保存成功')
        profileManageVisible.value = false
        await loadProfileOptions()
        await handlePreview()
    } catch (error: any) {
        feedback.msgError(error?.message || '模板配置保存失败')
    } finally {
        profileManageSaving.value = false
    }
}

/**
 * 选择模板卡片
 */
const handleSelectProfile = (item: any) => {
    formData.profile = String(item?.key || 'commercial_default')
}

/**
 * 解析功能开关覆盖配置
 */
const parseFeatureOverrides = () => {
    const rawText = String(featureOverridesText.value || '').trim() || '{}'
    const parsed = JSON.parse(rawText)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('功能开关覆盖必须是 JSON 对象')
    }
    return parsed
}

/**
 * 构建接口请求参数
 */
const buildPayload = () => {
    const payload: any = {
        profile: formData.profile,
        edition: formData.edition,
        brandName: formData.brandName,
        brandDomain: formData.brandDomain,
        customerName: formData.customerName,
        companyName: formData.companyName,
        contactEmail: formData.contactEmail,
        licenseKey: formData.licenseKey,
        bindDomain: formData.bindDomain,
        includeSiteSettings: formData.includeSiteSettings,
        includeWebsiteCategories: formData.includeWebsiteCategories,
        includeWebsiteTags: formData.includeWebsiteTags,
        includeSampleWebsites: formData.includeSampleWebsites,
        includeArticleCategories: formData.includeArticleCategories,
        includeArticleTags: formData.includeArticleTags,
        includeSampleArticles: formData.includeSampleArticles,
        applyLicense: formData.applyLicense,
        resetFeatureOverrides: formData.resetFeatureOverrides,
        seedUsers: formData.seedUsers
    }
    if (!formData.resetFeatureOverrides) {
        payload.featureOverrides = parseFeatureOverrides()
    }
    return payload
}

/**
 * 渲染启用模块名称
 */
const renderEnabledModules = (modules: Record<string, boolean>) => {
    const labels: Record<string, string> = {
        siteSettings: '站点配置',
        websiteCategories: '网站分类',
        websiteTags: '网站标签',
        sampleWebsites: '示例网站',
        articleCategories: '文章分类',
        articleTags: '文章标签',
        sampleArticles: '示例文章',
        licenseActivation: '授权激活',
        licenseKeyProvided: '授权码已填写',
        seedUsers: '测试用户'
    }
    return Object.keys(labels)
        .filter((key) => modules?.[key])
        .map((key) => labels[key])
}

/**
 * 获取发布自检状态标签类型。
 */
const getDoctorStatusTagType = (status: string) => {
    if (status === 'pass') return 'success'
    if (status === 'warn') return 'warning'
    if (status === 'fail') return 'danger'
    return 'info'
}

/**
 * 获取发布自检状态中文文案。
 */
const getDoctorStatusLabel = (status: string) => {
    if (status === 'pass') return '通过'
    if (status === 'warn') return '警告'
    if (status === 'fail') return '失败'
    return '未知'
}

/**
 * 执行发布自检，只读取当前环境与数据库状态，不做写入。
 */
const runDoctorCheck = async (silent = false) => {
    doctorLoading.value = true
    try {
        const data = await uiedDeliveryInitDoctor()
        doctorData.value = data || null
        const fail = Number(data?.summary?.fail || 0)
        const warn = Number(data?.summary?.warn || 0)
        if (silent) return
        if (fail > 0) {
            feedback.msgError(`发布自检发现 ${fail} 个失败项`)
        } else if (warn > 0) {
            feedback.msgWarning(`发布自检发现 ${warn} 个警告项`)
        } else {
            feedback.msgSuccess('发布自检通过')
        }
    } catch (error: any) {
        feedback.msgError(error?.message || '发布自检失败')
    } finally {
        doctorLoading.value = false
    }
}

/**
 * 手动执行发布自检，并显示检查结果提示。
 */
const handleDoctorCheck = async () => {
    await runDoctorCheck(false)
}

/**
 * 拉取初始化预览结果
 */
const handlePreview = async () => {
    previewLoading.value = true
    try {
        const data = await uiedDeliveryInitPreview(buildPayload())
        previewData.value = data || null
    } catch (error: any) {
        feedback.msgError(error?.message || '预览失败')
    } finally {
        previewLoading.value = false
    }
}

/**
 * 执行交付初始化
 */
const handleExecute = async () => {
    try {
        await feedback.confirm('该操作会写入配置与示例数据，确定继续执行？')
    } catch (_error) {
        return
    }
    executeLoading.value = true
    try {
        const data = await uiedDeliveryInitExecute(buildPayload())
        executeResult.value = data || null
        feedback.msgSuccess('交付初始化执行成功')
        await handlePreview()
    } catch (error: any) {
        feedback.msgError(error?.message || '交付初始化执行失败')
    } finally {
        executeLoading.value = false
    }
}

/**
 * 导出客户交付包并触发本地下载
 */
const handleExportPackage = async () => {
    exportLoading.value = true
    try {
        const data = await uiedDeliveryPackageExport({
            ...buildPayload(),
            includeWebsiteData: false,
            includeArticleData: false
        })
        const filename = `uied_customer_package_${Date.now()}.json`
        const content = JSON.stringify(data || {}, null, 2)
        const blob = new Blob([content], { type: 'application/json;charset=utf-8' })
        const objectUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = objectUrl
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(objectUrl)
        feedback.msgSuccess('客户包导出成功')
    } catch (error: any) {
        feedback.msgError(error?.message || '客户包导出失败')
    } finally {
        exportLoading.value = false
    }
}

/**
 * 页面初始化
 */
const initializePage = async () => {
    await loadProfileOptions()
    await runDoctorCheck(true)
    await handlePreview()
}

onMounted(() => {
    initializePage()
})
</script>

<style lang="scss" scoped>
.delivery-profile-selector {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.delivery-profile-tip {
    font-size: 12px;
    color: var(--el-text-color-secondary);
}

.delivery-doctor-panel {
    margin-bottom: 18px;
    padding: 18px;
    border: 1px solid rgba(30, 64, 175, 0.1);
    border-radius: 14px;
    background: linear-gradient(135deg, #f8fbff 0%, #ffffff 100%);
}

.delivery-doctor-panel__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
}

.delivery-doctor-panel__eyebrow {
    margin-bottom: 6px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    color: var(--el-color-primary);
}

.delivery-doctor-panel__title {
    font-size: 18px;
    font-weight: 700;
    color: #111827;
}

.delivery-doctor-panel__desc {
    max-width: 760px;
    margin-top: 8px;
    font-size: 13px;
    line-height: 1.7;
    color: #667085;
}

.delivery-doctor-panel__summary {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 220px;
    justify-content: flex-end;
}

.delivery-doctor-panel__score {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 58px;
    height: 58px;
    border-radius: 18px;
    font-size: 22px;
    font-weight: 800;
    color: #1d4ed8;
    background: rgba(59, 130, 246, 0.12);
}

.delivery-doctor-panel__score.is-ready {
    color: #047857;
    background: rgba(16, 185, 129, 0.12);
}

.delivery-doctor-panel__score.is-attention {
    color: #b45309;
    background: rgba(245, 158, 11, 0.14);
}

.delivery-doctor-panel__score.is-risk {
    color: #b91c1c;
    background: rgba(239, 68, 68, 0.12);
}

.delivery-doctor-panel__summary-text {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: #667085;
}

.delivery-doctor-panel__body {
    margin-top: 16px;
}

.delivery-doctor-panel__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 14px;
    margin-bottom: 12px;
    font-size: 12px;
    color: #667085;
}

.delivery-doctor-panel__group-title {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    font-weight: 600;
}

.delivery-doctor-panel__checks {
    display: grid;
    gap: 10px;
}

.delivery-doctor-panel__check {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 10px;
    background: #ffffff;
    border: 1px solid rgba(15, 23, 42, 0.06);
}

.delivery-doctor-panel__check-main {
    min-width: 0;
}

.delivery-doctor-panel__check-title {
    font-size: 13px;
    font-weight: 600;
    color: #111827;
}

.delivery-doctor-panel__check-message {
    margin-top: 4px;
    font-size: 12px;
    line-height: 1.6;
    color: #667085;
}

.delivery-doctor-panel__check-suggestion {
    margin-top: 4px;
    font-size: 12px;
    line-height: 1.6;
    color: #b45309;
}

.delivery-doctor-panel__commands {
    display: grid;
    gap: 4px;
    margin-top: 12px;
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(15, 23, 42, 0.04);
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12px;
    color: #475467;
}

.delivery-profile-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    width: 100%;
}

.delivery-profile-card {
    text-align: left;
    border: 1px solid var(--el-border-color);
    background: var(--el-bg-color);
    border-radius: 10px;
    padding: 12px 14px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.delivery-profile-card:hover {
    border-color: var(--el-color-primary-light-5);
}

.delivery-profile-card.is-active {
    border-color: var(--el-color-primary);
    box-shadow: 0 0 0 1px var(--el-color-primary-light-8) inset;
}

.delivery-profile-card .card-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
}

.delivery-profile-card .card-description {
    margin-top: 6px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--el-text-color-secondary);
}

.delivery-profile-card .card-meta {
    margin-top: 8px;
    font-size: 12px;
    color: var(--el-color-primary);
}

@media (max-width: 1200px) {
    .delivery-profile-grid {
        grid-template-columns: 1fr;
    }

    .delivery-doctor-panel__header {
        flex-direction: column;
    }

    .delivery-doctor-panel__summary {
        width: 100%;
        justify-content: flex-start;
    }
}
</style>
