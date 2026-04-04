<!--
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-04-04
 */
-->
<template>
    <div class="upgrade-center-page">
        <el-card shadow="never" class="!border-none">
            <template #header>
                <div class="flex items-center justify-between">
                    <span class="font-medium">升级中心配置</span>
                    <el-space>
                        <el-button :loading="configLoading" @click="loadConfig">刷新配置</el-button>
                        <el-button type="primary" :loading="configSaving" @click="saveConfig">
                            保存配置
                        </el-button>
                    </el-space>
                </div>
            </template>
            <el-alert
                title="安全基线：仅超级管理员可升级，升级包必须提供 SHA256，执行前自动备份，失败自动回滚。"
                type="warning"
                :closable="false"
                show-icon
                class="mb-4"
            />
            <el-form :model="upgradeConfig" label-width="140px" class="upgrade-form">
                <el-form-item label="升级包目录">
                    <el-input v-model.trim="upgradeConfig.packageDir" />
                </el-form-item>
                <el-form-item label="备份目录">
                    <el-input v-model.trim="upgradeConfig.backupDir" />
                </el-form-item>
                <el-form-item label="临时目录">
                    <el-input v-model.trim="upgradeConfig.tempDir" />
                </el-form-item>
                <el-form-item label="前端部署目录">
                    <el-input v-model.trim="upgradeConfig.frontendDeployDir" />
                </el-form-item>
                <el-form-item label="管理后台目录">
                    <el-input v-model.trim="upgradeConfig.adminDeployDir" />
                </el-form-item>
                <el-form-item label="后端部署目录">
                    <el-input v-model.trim="upgradeConfig.backendDeployDir" />
                </el-form-item>
                <el-form-item label="健康检查地址">
                    <el-input v-model.trim="upgradeConfig.healthcheckUrl" />
                </el-form-item>
                <el-form-item label="重启模式">
                    <el-select v-model="upgradeConfig.restartMode" class="w-[280px]">
                        <el-option label="none（不重启）" value="none" />
                        <el-option label="pm2_all（pm2 restart all）" value="pm2_all" />
                        <el-option label="pm2_backend（pm2 restart uied-server）" value="pm2_backend" />
                        <el-option label="systemd_uied（systemctl restart uied-server）" value="systemd_uied" />
                    </el-select>
                </el-form-item>
                <el-form-item label="执行 SQL 补丁">
                    <el-switch v-model="upgradeConfig.applyDbPatch" />
                </el-form-item>
                <el-form-item label="二次确认口令">
                    <el-input v-model.trim="upgradeConfig.confirmPhrase" class="w-[280px]" />
                </el-form-item>
            </el-form>
        </el-card>

        <el-card shadow="never" class="!border-none mt-4">
            <template #header>
                <div class="flex items-center justify-between">
                    <span class="font-medium">服务器升级包</span>
                    <el-button :loading="bundleLoading" @click="loadBundleList">刷新升级包</el-button>
                </div>
            </template>
            <el-table :data="bundleList" size="large" max-height="280">
                <el-table-column prop="bundleName" label="包路径" min-width="340" />
                <el-table-column label="大小" width="130">
                    <template #default="{ row }">{{ formatBytes(row.size) }}</template>
                </el-table-column>
                <el-table-column label="更新时间" width="180">
                    <template #default="{ row }">{{ formatTime(row.mtime) }}</template>
                </el-table-column>
                <el-table-column label="操作" width="150" fixed="right">
                    <template #default="{ row }">
                        <el-button link type="primary" @click="applyBundle(row.bundleName)">选用该包</el-button>
                    </template>
                </el-table-column>
            </el-table>
        </el-card>

        <el-card shadow="never" class="!border-none mt-4">
            <template #header>
                <div class="font-medium">发起升级</div>
            </template>
            <el-form :model="upgradeForm" label-width="140px" class="upgrade-form">
                <el-form-item label="升级包路径">
                    <el-input
                        v-model.trim="upgradeForm.bundleName"
                        placeholder="相对升级包目录，例如：1.1.1/uied-nav-1.1.1-release-bundle.tgz"
                    />
                </el-form-item>
                <el-form-item label="目标版本号">
                    <el-input v-model.trim="upgradeForm.targetVersion" placeholder="例如：1.1.2" class="w-[280px]" />
                </el-form-item>
                <el-form-item label="SHA256 校验值">
                    <el-input
                        v-model.trim="upgradeForm.expectedSha256"
                        placeholder="必须填写 64 位 SHA256（用于验签）"
                    />
                </el-form-item>
                <el-form-item label="二次确认口令">
                    <el-input
                        v-model.trim="upgradeForm.confirmPhrase"
                        :placeholder="`请输入 ${upgradeConfig.confirmPhrase || 'UPGRADE'}`"
                        class="w-[280px]"
                    />
                </el-form-item>
                <el-form-item label="管理员密码">
                    <el-input
                        v-model="upgradeForm.adminPassword"
                        type="password"
                        show-password
                        placeholder="用于二次认证，不会持久化保存"
                        class="w-[320px]"
                    />
                </el-form-item>
                <el-form-item>
                    <el-button type="danger" :loading="upgradeStarting" @click="startUpgradeTask">
                        开始升级（自动备份 + 自动回滚）
                    </el-button>
                </el-form-item>
            </el-form>
        </el-card>

        <el-card shadow="never" class="!border-none mt-4">
            <template #header>
                <div class="flex items-center justify-between">
                    <span class="font-medium">升级任务审计</span>
                    <el-space>
                        <el-button :loading="taskPager.loading" @click="loadTaskList">刷新任务</el-button>
                    </el-space>
                </div>
            </template>
            <el-table :data="taskPager.lists" size="large" max-height="360">
                <el-table-column prop="task_no" label="任务号" min-width="220" />
                <el-table-column prop="target_version" label="目标版本" width="120" />
                <el-table-column prop="bundle_name" label="升级包" min-width="220" />
                <el-table-column label="状态" width="120">
                    <template #default="{ row }">
                        <el-tag :type="resolveTaskTagType(row.status)">{{ row.status }}</el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="执行人" width="130">
                    <template #default="{ row }">{{ row.operator_nickname || row.operator_username || '-' }}</template>
                </el-table-column>
                <el-table-column label="开始时间" width="170">
                    <template #default="{ row }">{{ formatTime(row.started_at) }}</template>
                </el-table-column>
                <el-table-column label="完成时间" width="170">
                    <template #default="{ row }">{{ formatTime(row.finished_at) }}</template>
                </el-table-column>
                <el-table-column label="操作" width="180" fixed="right">
                    <template #default="{ row }">
                        <el-button link type="primary" @click="openTaskDetail(row.task_no)">详情</el-button>
                        <el-button link type="info" @click="openTaskLog(row.task_no)">日志</el-button>
                    </template>
                </el-table-column>
            </el-table>
            <div class="flex justify-end mt-4">
                <pagination v-model="taskPager" @change="loadTaskList" />
            </div>
        </el-card>

        <el-dialog v-model="detailDialogVisible" title="升级任务详情" width="860px">
            <el-descriptions v-if="taskDetail" :column="2" border>
                <el-descriptions-item label="任务号">{{ taskDetail.task_no }}</el-descriptions-item>
                <el-descriptions-item label="状态">
                    <el-tag :type="resolveTaskTagType(taskDetail.status)">{{ taskDetail.status }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="目标版本">{{ taskDetail.target_version || '-' }}</el-descriptions-item>
                <el-descriptions-item label="执行阶段">{{ taskDetail.phase || '-' }}</el-descriptions-item>
                <el-descriptions-item label="升级包">{{ taskDetail.bundle_name || '-' }}</el-descriptions-item>
                <el-descriptions-item label="执行人">
                    {{ taskDetail.operator_nickname || taskDetail.operator_username || '-' }}
                </el-descriptions-item>
                <el-descriptions-item label="前端备份">{{ taskDetail.backup_frontend_path || '-' }}</el-descriptions-item>
                <el-descriptions-item label="后台备份">{{ taskDetail.backup_admin_path || '-' }}</el-descriptions-item>
                <el-descriptions-item label="后端备份">{{ taskDetail.backup_backend_path || '-' }}</el-descriptions-item>
                <el-descriptions-item label="数据库备份">{{ taskDetail.backup_db_path || '-' }}</el-descriptions-item>
                <el-descriptions-item label="回滚状态">{{ taskDetail.rollback_status || '-' }}</el-descriptions-item>
                <el-descriptions-item label="回滚说明">{{ taskDetail.rollback_message || '-' }}</el-descriptions-item>
                <el-descriptions-item label="错误信息" :span="2">
                    {{ taskDetail.error_message || '-' }}
                </el-descriptions-item>
            </el-descriptions>
        </el-dialog>

        <el-dialog v-model="logDialogVisible" title="升级任务日志" width="980px">
            <el-input v-model="taskLogText" type="textarea" :rows="24" readonly />
            <template #footer>
                <el-button :loading="taskLogLoading" @click="refreshTaskLog">刷新日志</el-button>
                <el-button @click="logDialogVisible = false">关闭</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script lang="ts" setup name="uiedUpgradeCenter">
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-04-04
 */
import { reactive, ref } from 'vue'
import { usePaging } from '@/hooks/usePaging'
import feedback from '@/utils/feedback'
import {
    uiedUpgradeConfigGet,
    uiedUpgradeConfigSave,
    uiedUpgradeBundleList,
    uiedUpgradeTaskList,
    uiedUpgradeTaskDetail,
    uiedUpgradeTaskLog,
    uiedUpgradeStart
} from '@/api/uied'

const configLoading = ref(false)
const configSaving = ref(false)
const bundleLoading = ref(false)
const upgradeStarting = ref(false)
const detailDialogVisible = ref(false)
const logDialogVisible = ref(false)
const taskLogLoading = ref(false)
const currentLogTaskNo = ref('')
const taskLogText = ref('')
const bundleList = ref<any[]>([])
const taskDetail = ref<any>(null)

const upgradeConfig = reactive({
    packageDir: '',
    backupDir: '',
    tempDir: '',
    frontendDeployDir: '',
    adminDeployDir: '',
    backendDeployDir: '',
    healthcheckUrl: '',
    restartMode: 'none',
    applyDbPatch: true,
    confirmPhrase: 'UPGRADE'
})

const upgradeForm = reactive({
    bundleName: '',
    targetVersion: '',
    expectedSha256: '',
    confirmPhrase: '',
    adminPassword: ''
})

const { pager: taskPager, getLists: fetchTaskList } = usePaging({
    page: 1,
    size: 10,
    fetchFun: uiedUpgradeTaskList
})

/**
 * 格式化文件体积
 */
const formatBytes = (value: unknown) => {
    const size = Number(value || 0)
    if (!Number.isFinite(size) || size <= 0) return '0 B'
    if (size < 1024) return `${size.toFixed(0)} B`
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`
    if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(2)} MB`
    return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`
}

/**
 * 格式化时间戳
 */
const formatTime = (timestamp: unknown) => {
    const value = Number(timestamp || 0)
    if (!Number.isFinite(value) || value <= 0) return '-'
    const date = new Date(value * 1000)
    const pad = (num: number) => String(num).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
        date.getHours()
    )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/**
 * 解析任务状态标签类型
 */
const resolveTaskTagType = (status: string) => {
    const text = String(status || '').toLowerCase()
    if (text === 'success') return 'success'
    if (text === 'failed') return 'danger'
    if (text === 'running') return 'warning'
    return 'info'
}

/**
 * 加载升级中心配置
 */
const loadConfig = async () => {
    configLoading.value = true
    try {
        const data = await uiedUpgradeConfigGet()
        Object.assign(upgradeConfig, data || {})
        if (!upgradeForm.confirmPhrase) {
            upgradeForm.confirmPhrase = String(upgradeConfig.confirmPhrase || 'UPGRADE')
        }
    } catch (error: any) {
        feedback.msgError(error?.message || '加载升级配置失败')
    } finally {
        configLoading.value = false
    }
}

/**
 * 保存升级中心配置
 */
const saveConfig = async () => {
    configSaving.value = true
    try {
        await uiedUpgradeConfigSave({ ...upgradeConfig })
        feedback.msgSuccess('升级配置已保存')
    } catch (error: any) {
        feedback.msgError(error?.message || '保存升级配置失败')
    } finally {
        configSaving.value = false
    }
}

/**
 * 加载服务器升级包列表
 */
const loadBundleList = async () => {
    bundleLoading.value = true
    try {
        const data = await uiedUpgradeBundleList()
        bundleList.value = Array.isArray(data) ? data : []
    } catch (error: any) {
        feedback.msgError(error?.message || '加载升级包失败')
    } finally {
        bundleLoading.value = false
    }
}

/**
 * 选中升级包并回填到升级表单
 */
const applyBundle = (bundleName: string) => {
    upgradeForm.bundleName = String(bundleName || '').trim()
    feedback.msgSuccess('已填入升级包路径，请继续填写 SHA256 与管理员密码')
}

/**
 * 加载升级任务列表
 */
const loadTaskList = async () => {
    try {
        await fetchTaskList()
    } catch (error: any) {
        feedback.msgError(error?.message || '加载升级任务失败')
    }
}

/**
 * 打开升级任务详情弹窗
 */
const openTaskDetail = async (taskNo: string) => {
    try {
        const data = await uiedUpgradeTaskDetail({ taskNo })
        taskDetail.value = data || null
        detailDialogVisible.value = true
    } catch (error: any) {
        feedback.msgError(error?.message || '加载任务详情失败')
    }
}

/**
 * 刷新当前日志弹窗内容
 */
const refreshTaskLog = async () => {
    if (!currentLogTaskNo.value) return
    taskLogLoading.value = true
    try {
        const data = await uiedUpgradeTaskLog({ taskNo: currentLogTaskNo.value, lines: 300 })
        taskLogText.value = String(data?.content || '')
    } catch (error: any) {
        feedback.msgError(error?.message || '加载任务日志失败')
    } finally {
        taskLogLoading.value = false
    }
}

/**
 * 打开日志弹窗并立即拉取最新日志
 */
const openTaskLog = async (taskNo: string) => {
    currentLogTaskNo.value = String(taskNo || '').trim()
    logDialogVisible.value = true
    await refreshTaskLog()
}

/**
 * 发起升级任务（带二次确认）
 */
const startUpgradeTask = async () => {
    const bundleName = String(upgradeForm.bundleName || '').trim()
    const expectedSha256 = String(upgradeForm.expectedSha256 || '').trim().toLowerCase()
    const adminPassword = String(upgradeForm.adminPassword || '').trim()
    const confirmPhrase = String(upgradeForm.confirmPhrase || '').trim()
    const shouldPhrase = String(upgradeConfig.confirmPhrase || 'UPGRADE').trim()
    if (!bundleName) {
        feedback.msgError('请先填写升级包路径')
        return
    }
    if (!/^[a-f0-9]{64}$/.test(expectedSha256)) {
        feedback.msgError('请填写有效的 64 位 SHA256 校验值')
        return
    }
    if (!adminPassword) {
        feedback.msgError('请填写管理员密码')
        return
    }
    if (confirmPhrase !== shouldPhrase) {
        feedback.msgError(`二次确认口令不正确，请输入 ${shouldPhrase}`)
        return
    }

    await feedback.confirm(
        '即将执行升级：系统会自动备份代码和数据库，若升级失败将尝试自动回滚。确认继续吗？'
    )
    upgradeStarting.value = true
    try {
        const data = await uiedUpgradeStart({
            bundleName,
            targetVersion: String(upgradeForm.targetVersion || '').trim(),
            expectedSha256,
            confirmPhrase,
            adminPassword
        })
        feedback.msgSuccess(`升级任务已启动：${data?.taskNo || ''}`)
        upgradeForm.adminPassword = ''
        await loadTaskList()
    } catch (error: any) {
        feedback.msgError(error?.message || '启动升级失败')
    } finally {
        upgradeStarting.value = false
    }
}

/**
 * 页面初始化：加载配置、升级包和任务列表
 */
const bootstrap = async () => {
    await loadConfig()
    await Promise.all([loadBundleList(), loadTaskList()])
}

bootstrap()
</script>

<style lang="scss" scoped>
.upgrade-center-page {
    display: grid;
    gap: 16px;
}

.upgrade-form {
    max-width: 980px;
}
</style>
