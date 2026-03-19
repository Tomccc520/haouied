<!--
 * @file views/uied/aiConfig/index.vue
 * @description AI 助手管理页面 - 多 Tab 布局（配置管理、批量生成、使用统计、功能开关）
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 2.0.0
-->
<template>
    <div class="ai-config">
        <el-card class="!border-none" shadow="never">
            <template #header>
                <div class="flex items-center justify-between">
                    <span class="text-lg font-medium">AI 助手管理</span>
                </div>
            </template>

            <el-tabs v-model="activeTab">
                <!-- Tab 1: 配置管理 -->
                <el-tab-pane label="配置管理" name="config">
                    <!-- 操作栏 -->
                    <div class="mb-4 flex justify-between items-center">
                        <el-button type="primary" @click="handleAdd">
                            <template #icon><icon name="el-icon-Plus" /></template>
                            新增配置
                        </el-button>
                        <span class="text-gray-400 text-sm">共 {{ configList.length }} 个配置</span>
                    </div>

                    <!-- 配置列表表格 -->
                    <el-table :data="configList" v-loading="configLoading" size="large">
                        <el-table-column
                            label="名称"
                            prop="name"
                            min-width="120"
                            show-overflow-tooltip
                        />
                        <el-table-column label="提供商" prop="provider" width="120">
                            <template #default="{ row }">
                                <el-tag size="small">{{ getProviderLabel(row.provider) }}</el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="模型" min-width="220" show-overflow-tooltip>
                            <template #default="{ row }">
                                <div class="flex items-center gap-2 flex-wrap">
                                    <span>{{ row.model || '-' }}</span>
                                    <el-tag
                                        v-if="row.reasoningEnabled"
                                        size="small"
                                        type="warning"
                                        effect="plain"
                                    >
                                        推理
                                    </el-tag>
                                    <el-tag
                                        v-if="
                                            row.reasoningEnabled &&
                                            Number(row.thinkingBudget || 0) > 0
                                        "
                                        size="small"
                                        effect="plain"
                                    >
                                        budget={{ Number(row.thinkingBudget) }}
                                    </el-tag>
                                </div>
                            </template>
                        </el-table-column>
                        <el-table-column label="状态" width="90" align="center">
                            <template #default="{ row }">
                                <el-switch
                                    :model-value="row.enabled"
                                    @change="(val: string | number | boolean) => handleToggleEnabled(row, !!val)"
                                    size="small"
                                />
                            </template>
                        </el-table-column>
                        <el-table-column label="默认" width="90" align="center">
                            <template #default="{ row }">
                                <el-tag
                                    v-if="row.isDefault"
                                    type="success"
                                    size="small"
                                    effect="dark"
                                    >默认</el-tag
                                >
                                <el-button
                                    v-else
                                    link
                                    type="primary"
                                    size="small"
                                    @click="handleSetDefault(row)"
                                    >设为默认</el-button
                                >
                            </template>
                        </el-table-column>
                        <el-table-column label="操作" width="200" fixed="right">
                            <template #default="{ row }">
                                <el-button type="primary" link @click="handleEdit(row)"
                                    >编辑</el-button
                                >
                                <el-button
                                    type="success"
                                    link
                                    :disabled="!row.apiKey"
                                    @click="handleTestConnection(row)"
                                    >测试连接</el-button
                                >
                                <el-button type="danger" link @click="handleDelete(row)"
                                    >删除</el-button
                                >
                            </template>
                        </el-table-column>
                    </el-table>
                </el-tab-pane>

                <!-- Tab 2: 导入配置 -->
                <el-tab-pane label="导入配置" name="import">
                    <div v-loading="importConfigLoading" class="import-config-panel">
                        <el-alert
                            type="info"
                            :closable="false"
                            title="批量导入文章/网址的模型与提示词统一在此维护，导入弹窗只保留启用开关。"
                        />

                        <div class="import-config-toolbar mt-4">
                            <div class="text-xs text-gray-500">
                                支持预设模板快速套用；保存后会立即生效到“批量导入文章/网址”。
                            </div>
                            <div class="import-config-toolbar__actions">
                                <el-button
                                    :disabled="importConfigSaveLoading || importConfigLoading"
                                    @click="handleResetAllImportConfig"
                                >
                                    一键恢复默认模板
                                </el-button>
                                <el-button
                                    type="primary"
                                    :loading="importConfigSaveLoading"
                                    @click="handleSaveImportConfig"
                                >
                                    保存导入配置
                                </el-button>
                            </div>
                        </div>

                        <el-card shadow="never" class="mt-4 import-network-card">
                            <template #header>
                                <div class="import-module-card__header">
                                    <div>
                                        <div class="import-module-card__title">导入网络容错</div>
                                        <div class="import-module-card__desc">
                                            处理公众号导入与正文图片转存时的证书链兼容
                                        </div>
                                    </div>
                                </div>
                            </template>
                            <el-form label-width="150px">
                                <el-form-item label="证书容错开关">
                                    <el-switch
                                        v-model="importConfigForm.network.allowInsecureTls"
                                        active-text="开启"
                                        inactive-text="关闭"
                                    />
                                    <div class="text-xs text-gray-500 mt-2">
                                        开启后，当遇到证书链错误时会对“白名单域名”自动降级重试。
                                    </div>
                                </el-form-item>
                                <el-form-item label="容错域名白名单">
                                    <el-select
                                        v-model="importConfigForm.network.insecureDomains"
                                        multiple
                                        filterable
                                        allow-create
                                        default-first-option
                                        collapse-tags
                                        collapse-tags-tooltip
                                        class="w-100"
                                        placeholder="输入域名并回车（如 mp.weixin.qq.com）"
                                    >
                                        <el-option
                                            v-for="item in importInsecureDomainSuggestions"
                                            :key="item"
                                            :label="item"
                                            :value="item"
                                        />
                                    </el-select>
                                    <div class="text-xs text-gray-500 mt-2">
                                        仅支持域名，不需要填写协议；支持子域名匹配。
                                    </div>
                                </el-form-item>
                            </el-form>
                        </el-card>

                        <el-card shadow="never" class="mt-4 import-module-card">
                            <template #header>
                                <div class="import-module-card__header">
                                    <div>
                                        <div class="import-module-card__title">批量导入文章</div>
                                        <div class="import-module-card__desc">
                                            控制公众号文章导入后的 AI 润色策略
                                        </div>
                                    </div>
                                    <el-switch
                                        v-model="importConfigForm.articleBatchImport.enabled"
                                        active-text="启用"
                                        inactive-text="关闭"
                                    />
                                </div>
                            </template>
                            <div class="import-module-card__preset">
                                <el-select
                                    v-model="selectedArticlePresetId"
                                    clearable
                                    filterable
                                    class="import-module-card__preset-select"
                                    placeholder="选择文章模板预设"
                                >
                                    <el-option
                                        v-for="item in articleImportPresetList"
                                        :key="item.id"
                                        :label="`${item.name} · ${item.description}`"
                                        :value="item.id"
                                    />
                                </el-select>
                                <el-button
                                    :disabled="!selectedArticlePresetId"
                                    @click="handleApplyImportPreset('article')"
                                >
                                    应用预设
                                </el-button>
                                <el-button @click="handleResetImportModuleToDefault('article')">
                                    恢复默认
                                </el-button>
                                <el-button @click="handleCopyImportPrompt('article')">
                                    复制提示词
                                </el-button>
                            </div>
                            <el-form label-width="150px">
                                <el-form-item label="模型名称">
                                    <el-select
                                        v-model="importConfigForm.articleBatchImport.model"
                                        clearable
                                        filterable
                                        allow-create
                                        default-first-option
                                        placeholder="留空则使用默认 AI 模型"
                                        class="w-100"
                                    >
                                        <el-option
                                            v-for="item in importModelOptions"
                                            :key="`article-model-${item.value}`"
                                            :label="item.label"
                                            :value="item.value"
                                        />
                                    </el-select>
                                </el-form-item>
                                <el-form-item label="提示词模板">
                                    <el-input
                                        v-model="importConfigForm.articleBatchImport.promptTemplate"
                                        type="textarea"
                                        :rows="8"
                                        placeholder="请输入文章导入 AI 润色提示词模板"
                                    />
                                    <div class="text-xs text-gray-500 mt-2">
                                        可用变量：{title}、{intro}、{content}、{author}、{sourceUrl}
                                    </div>
                                </el-form-item>
                            </el-form>
                            <div class="import-preset-manage">
                                <div class="import-preset-manage__header">
                                    <span class="import-preset-manage__title">模板库管理</span>
                                    <div class="import-preset-manage__actions">
                                        <el-button size="small" @click="handleOpenImportPresetDialog('article')">
                                            新增模板
                                        </el-button>
                                        <el-button
                                            size="small"
                                            type="primary"
                                            :loading="importTemplatePresetsSaveLoading"
                                            @click="handleSaveImportTemplatePresets"
                                        >
                                            保存模板库
                                        </el-button>
                                    </div>
                                </div>
                                <el-table :data="articleImportPresetList" size="small" border>
                                    <el-table-column label="排序" width="72" align="center">
                                        <template #default="{ row }">{{ row.sort }}</template>
                                    </el-table-column>
                                    <el-table-column label="模板名称" min-width="140" show-overflow-tooltip>
                                        <template #default="{ row }">{{ row.name }}</template>
                                    </el-table-column>
                                    <el-table-column label="说明" min-width="180" show-overflow-tooltip>
                                        <template #default="{ row }">{{ row.description || '-' }}</template>
                                    </el-table-column>
                                    <el-table-column label="模型" min-width="180" show-overflow-tooltip>
                                        <template #default="{ row }">{{ row.model || '默认模型' }}</template>
                                    </el-table-column>
                                    <el-table-column label="状态" width="84" align="center">
                                        <template #default="{ row }">
                                            <el-tag :type="row.enabled === false ? 'info' : 'success'" size="small">
                                                {{ row.enabled === false ? '停用' : '启用' }}
                                            </el-tag>
                                        </template>
                                    </el-table-column>
                                    <el-table-column label="操作" width="230" align="center">
                                        <template #default="{ row, $index }">
                                            <el-button
                                                size="small"
                                                link
                                                type="primary"
                                                :disabled="$index === 0"
                                                @click="handleMoveImportPreset('article', $index, 'up')"
                                            >
                                                上移
                                            </el-button>
                                            <el-button
                                                size="small"
                                                link
                                                type="primary"
                                                :disabled="$index === articleImportPresetList.length - 1"
                                                @click="handleMoveImportPreset('article', $index, 'down')"
                                            >
                                                下移
                                            </el-button>
                                            <el-button
                                                size="small"
                                                link
                                                type="primary"
                                                @click="handleOpenImportPresetDialog('article', row)"
                                            >
                                                编辑
                                            </el-button>
                                            <el-button
                                                size="small"
                                                link
                                                type="danger"
                                                @click="handleDeleteImportPreset('article', row)"
                                            >
                                                删除
                                            </el-button>
                                        </template>
                                    </el-table-column>
                                </el-table>
                            </div>
                        </el-card>

                        <el-card shadow="never" class="mt-4 import-module-card">
                            <template #header>
                                <div class="import-module-card__header">
                                    <div>
                                        <div class="import-module-card__title">批量导入网址</div>
                                        <div class="import-module-card__desc">
                                            控制网址导入后的 AI 详情正文生成策略
                                        </div>
                                    </div>
                                    <el-switch
                                        v-model="importConfigForm.websiteBatchImport.enabled"
                                        active-text="启用"
                                        inactive-text="关闭"
                                    />
                                </div>
                            </template>
                            <div class="import-module-card__preset">
                                <el-select
                                    v-model="selectedWebsitePresetId"
                                    clearable
                                    filterable
                                    class="import-module-card__preset-select"
                                    placeholder="选择网址模板预设"
                                >
                                    <el-option
                                        v-for="item in websiteImportPresetList"
                                        :key="item.id"
                                        :label="`${item.name} · ${item.description}`"
                                        :value="item.id"
                                    />
                                </el-select>
                                <el-button
                                    :disabled="!selectedWebsitePresetId"
                                    @click="handleApplyImportPreset('website')"
                                >
                                    应用预设
                                </el-button>
                                <el-button @click="handleResetImportModuleToDefault('website')">
                                    恢复默认
                                </el-button>
                                <el-button @click="handleCopyImportPrompt('website')">
                                    复制提示词
                                </el-button>
                            </div>
                            <el-form label-width="150px">
                                <el-form-item label="模型名称">
                                    <el-select
                                        v-model="importConfigForm.websiteBatchImport.model"
                                        clearable
                                        filterable
                                        allow-create
                                        default-first-option
                                        placeholder="留空则使用默认 AI 模型"
                                        class="w-100"
                                    >
                                        <el-option
                                            v-for="item in importModelOptions"
                                            :key="`website-model-${item.value}`"
                                            :label="item.label"
                                            :value="item.value"
                                        />
                                    </el-select>
                                </el-form-item>
                                <el-form-item label="提示词模板">
                                    <el-input
                                        v-model="importConfigForm.websiteBatchImport.promptTemplate"
                                        type="textarea"
                                        :rows="8"
                                        placeholder="请输入网址导入 AI 正文生成提示词模板"
                                    />
                                    <div class="text-xs text-gray-500 mt-2">
                                        可用变量：{websiteName}、{websiteUrl}、{websiteDescription}、{websiteTags}
                                    </div>
                                </el-form-item>
                            </el-form>
                            <div class="import-preset-manage">
                                <div class="import-preset-manage__header">
                                    <span class="import-preset-manage__title">模板库管理</span>
                                    <div class="import-preset-manage__actions">
                                        <el-button size="small" @click="handleOpenImportPresetDialog('website')">
                                            新增模板
                                        </el-button>
                                        <el-button
                                            size="small"
                                            type="primary"
                                            :loading="importTemplatePresetsSaveLoading"
                                            @click="handleSaveImportTemplatePresets"
                                        >
                                            保存模板库
                                        </el-button>
                                    </div>
                                </div>
                                <el-table :data="websiteImportPresetList" size="small" border>
                                    <el-table-column label="排序" width="72" align="center">
                                        <template #default="{ row }">{{ row.sort }}</template>
                                    </el-table-column>
                                    <el-table-column label="模板名称" min-width="140" show-overflow-tooltip>
                                        <template #default="{ row }">{{ row.name }}</template>
                                    </el-table-column>
                                    <el-table-column label="说明" min-width="180" show-overflow-tooltip>
                                        <template #default="{ row }">{{ row.description || '-' }}</template>
                                    </el-table-column>
                                    <el-table-column label="模型" min-width="180" show-overflow-tooltip>
                                        <template #default="{ row }">{{ row.model || '默认模型' }}</template>
                                    </el-table-column>
                                    <el-table-column label="状态" width="84" align="center">
                                        <template #default="{ row }">
                                            <el-tag :type="row.enabled === false ? 'info' : 'success'" size="small">
                                                {{ row.enabled === false ? '停用' : '启用' }}
                                            </el-tag>
                                        </template>
                                    </el-table-column>
                                    <el-table-column label="操作" width="230" align="center">
                                        <template #default="{ row, $index }">
                                            <el-button
                                                size="small"
                                                link
                                                type="primary"
                                                :disabled="$index === 0"
                                                @click="handleMoveImportPreset('website', $index, 'up')"
                                            >
                                                上移
                                            </el-button>
                                            <el-button
                                                size="small"
                                                link
                                                type="primary"
                                                :disabled="$index === websiteImportPresetList.length - 1"
                                                @click="handleMoveImportPreset('website', $index, 'down')"
                                            >
                                                下移
                                            </el-button>
                                            <el-button
                                                size="small"
                                                link
                                                type="primary"
                                                @click="handleOpenImportPresetDialog('website', row)"
                                            >
                                                编辑
                                            </el-button>
                                            <el-button
                                                size="small"
                                                link
                                                type="danger"
                                                @click="handleDeleteImportPreset('website', row)"
                                            >
                                                删除
                                            </el-button>
                                        </template>
                                    </el-table-column>
                                </el-table>
                            </div>
                        </el-card>
                        <div v-if="isImportConfigChanged" class="import-config-changed">
                            <el-alert
                                type="warning"
                                :closable="false"
                                title="当前导入配置有未保存改动，请记得点击“保存导入配置”。"
                            />
                        </div>
                    </div>
                </el-tab-pane>

                <!-- Tab 3: 批量生成 -->
                <el-tab-pane label="批量生成" name="batch">
                    <!-- 步骤一：选择网站和字段 -->
                    <div v-if="!batchGenerating && batchResults.length === 0" class="batch-setup">
                        <el-form label-width="100px">
                            <!-- 网站选择器 -->
                            <el-form-item label="选择网站">
                                <el-select
                                    v-model="selectedWebsiteIds"
                                    multiple
                                    filterable
                                    remote
                                    reserve-keyword
                                    :remote-method="searchWebsites"
                                    :loading="websiteSearchLoading"
                                    placeholder="请搜索并选择网站"
                                    class="w-100"
                                    @focus="handleWebsiteSelectFocus"
                                >
                                    <el-option
                                        v-for="item in websiteOptions"
                                        :key="item.id"
                                        :label="item.title || item.name"
                                        :value="item.id"
                                    >
                                        <span>{{ item.title || item.name }}</span>
                                        <span class="option-url-hint">{{ item.url }}</span>
                                    </el-option>
                                </el-select>
                            </el-form-item>

                            <!-- 生成字段选择 -->
                            <el-form-item label="生成字段">
                                <el-checkbox-group v-model="selectedFields">
                                    <el-checkbox label="description">网站描述</el-checkbox>
                                    <el-checkbox label="tags">网站标签</el-checkbox>
                                </el-checkbox-group>
                            </el-form-item>

                            <!-- 生成按钮 -->
                            <el-form-item>
                                <el-button
                                    type="primary"
                                    :disabled="
                                        selectedWebsiteIds.length === 0 ||
                                        selectedFields.length === 0
                                    "
                                    @click="handleBatchGenerate"
                                >
                                    开始批量生成（{{ selectedWebsiteIds.length }} 个网站）
                                </el-button>
                            </el-form-item>
                        </el-form>
                    </div>

                    <!-- 步骤二：生成进度展示 -->
                    <div v-if="batchGenerating" class="batch-progress">
                        <div class="mb-4 text-center">
                            <el-progress
                                :percentage="batchProgress"
                                :stroke-width="20"
                                striped
                                striped-flow
                            />
                        </div>
                        <div class="text-center text-gray-500 mt-2">
                            正在处理：{{ batchCurrentName || '准备中...' }} （{{
                                batchProcessed
                            }}/{{ batchTotal }}）
                        </div>
                    </div>

                    <!-- 步骤三：结果预览和确认 -->
                    <div v-if="!batchGenerating && batchResults.length > 0" class="batch-results">
                        <div class="mb-4 flex justify-between items-center">
                            <span class="text-lg font-medium">生成结果预览</span>
                            <div>
                                <el-button @click="handleBatchReset">重新选择</el-button>
                                <el-button
                                    type="primary"
                                    :loading="batchConfirmLoading"
                                    @click="handleBatchConfirm"
                                >
                                    确认保存
                                </el-button>
                            </div>
                        </div>

                        <el-table :data="batchResults" size="large">
                            <el-table-column
                                label="网站名称"
                                prop="name"
                                width="160"
                                show-overflow-tooltip
                            />
                            <el-table-column label="状态" width="100" align="center">
                                <template #default="{ row }">
                                    <el-tag
                                        v-if="row.status === 'success'"
                                        type="success"
                                        size="small"
                                        >成功</el-tag
                                    >
                                    <el-tooltip v-else :content="row.error" placement="top">
                                        <el-tag type="danger" size="small">失败</el-tag>
                                    </el-tooltip>
                                </template>
                            </el-table-column>
                            <el-table-column
                                v-if="selectedFields.includes('description')"
                                label="描述"
                                min-width="250"
                            >
                                <template #default="{ row }">
                                    <el-input
                                        v-if="row.status === 'success'"
                                        v-model="row.description"
                                        type="textarea"
                                        :autosize="{ minRows: 2, maxRows: 4 }"
                                    />
                                    <span v-else class="text-gray-400">—</span>
                                </template>
                            </el-table-column>
                            <el-table-column
                                v-if="selectedFields.includes('tags')"
                                label="标签"
                                min-width="200"
                            >
                                <template #default="{ row }">
                                    <el-input
                                        v-if="row.status === 'success'"
                                        v-model="row.tags"
                                        placeholder="多个标签用逗号分隔"
                                    />
                                    <span v-else class="text-gray-400">—</span>
                                </template>
                            </el-table-column>
                        </el-table>

                        <div class="mt-2 text-gray-400 text-sm">
                            共 {{ batchResults.length }} 个结果， 成功
                            {{ batchResults.filter((r) => r.status === 'success').length }} 个，
                            失败
                            {{ batchResults.filter((r) => r.status !== 'success').length }} 个。
                            可在表格中直接编辑生成内容，确认无误后点击「确认保存」。
                        </div>
                    </div>
                </el-tab-pane>

                <!-- Tab 4: 使用统计 -->
                <el-tab-pane label="使用统计" name="stats">
                    <!-- AI 未配置时的引导提示 -->
                    <div
                        v-if="configList.length === 0 && !configLoading"
                        class="flex flex-col items-center justify-center min-h-300"
                    >
                        <el-empty description="暂未配置 AI 服务">
                            <el-button type="primary" @click="activeTab = 'config'"
                                >前往配置</el-button
                            >
                        </el-empty>
                        <p class="text-gray-400 mt-2">
                            请先在「配置管理」中添加 AI 配置，启用后即可查看使用统计
                        </p>
                    </div>

                    <div v-else>
                        <!-- 汇总卡片 -->
                        <el-row :gutter="16" class="mb-4">
                            <el-col :xs="12" :sm="8" :md="6">
                                <el-card shadow="hover" class="stats-card">
                                    <div class="stats-card-title">总调用次数</div>
                                    <div class="stats-card-value">{{ statsData.totalCalls }}</div>
                                </el-card>
                            </el-col>
                            <el-col :xs="12" :sm="8" :md="6">
                                <el-card shadow="hover" class="stats-card">
                                    <div class="stats-card-title">总 Token 消耗</div>
                                    <div class="stats-card-value">{{ statsData.totalTokens }}</div>
                                </el-card>
                            </el-col>
                            <el-col :xs="12" :sm="8" :md="6">
                                <el-card shadow="hover" class="stats-card">
                                    <div class="stats-card-title">总成功率</div>
                                    <div class="stats-card-value">{{ statsData.successRate }}%</div>
                                </el-card>
                            </el-col>
                            <el-col :xs="12" :sm="8" :md="6">
                                <el-card shadow="hover" class="stats-card">
                                    <div class="stats-card-title">失败次数</div>
                                    <div class="stats-card-value stats-card-value--danger">
                                        {{ statsData.failedCalls }}
                                    </div>
                                </el-card>
                            </el-col>
                            <el-col :xs="12" :sm="8" :md="6">
                                <el-card shadow="hover" class="stats-card">
                                    <div class="stats-card-title">今日调用</div>
                                    <div class="stats-card-value">{{ statsData.todayCalls }}</div>
                                </el-card>
                            </el-col>
                            <el-col :xs="12" :sm="8" :md="6">
                                <el-card shadow="hover" class="stats-card">
                                    <div class="stats-card-title">平均耗时(ms)</div>
                                    <div class="stats-card-value">{{ statsData.avgDurationMs }}</div>
                                </el-card>
                            </el-col>
                        </el-row>

                        <div class="stats-summary-line">
                            <span>今日成功率：{{ statsData.todaySuccessRate }}%</span>
                            <span>今日失败：{{ statsData.todayFailedCalls }}</span>
                            <span>平均 Token/次：{{ statsData.avgTokensPerCall }}</span>
                        </div>

                        <el-card shadow="never" class="mb-4" v-if="featureStatsRows.length > 0">
                            <template #header>
                                <div class="stats-feature-header">
                                    <span class="stats-feature-title">功能使用分布</span>
                                    <span class="stats-feature-subtitle">按功能维度统计调用、成功率与 Token</span>
                                </div>
                            </template>
                            <el-table :data="featureStatsRows" size="small" border>
                                <el-table-column label="功能类型" min-width="120">
                                    <template #default="{ row }">
                                        <el-tag
                                            size="small"
                                            :type="getFeatureTypeTagType(row.featureType)"
                                        >
                                            {{ getFeatureTypeLabel(row.featureType) }}
                                        </el-tag>
                                    </template>
                                </el-table-column>
                                <el-table-column label="调用次数" prop="calls" width="100" align="right" />
                                <el-table-column label="成功率" width="100" align="right">
                                    <template #default="{ row }">{{ row.successRate }}%</template>
                                </el-table-column>
                                <el-table-column label="Token" prop="tokens" width="110" align="right" />
                            </el-table>
                        </el-card>

                        <!-- 筛选栏 -->
                        <div class="mb-4 flex items-center gap-3 flex-wrap">
                            <el-select
                                v-model="logFilter.featureType"
                                placeholder="功能类型"
                                clearable
                                class="input-w-160"
                                @change="handleLogFilterChange"
                            >
                                <el-option label="全部类型" value="" />
                                <el-option label="AI 对话" value="chat" />
                                <el-option label="内容生成" value="generate" />
                                <el-option label="AI 搜索" value="search" />
                                <el-option label="批量生成" value="batch_generate" />
                            </el-select>
                            <el-select
                                v-model="logFilter.responseStatus"
                                placeholder="状态"
                                clearable
                                class="input-w-160"
                                @change="handleLogFilterChange"
                            >
                                <el-option label="全部状态" value="" />
                                <el-option label="成功" value="success" />
                                <el-option label="失败" value="failed" />
                            </el-select>
                            <el-date-picker
                                v-model="logFilter.dateRange"
                                type="daterange"
                                range-separator="至"
                                start-placeholder="开始日期"
                                end-placeholder="结束日期"
                                value-format="YYYY-MM-DD"
                                class="input-w-280"
                                @change="handleLogFilterChange"
                            />
                        </div>

                        <!-- 日志表格 -->
                        <el-table :data="logList" v-loading="logLoading" size="large">
                            <el-table-column label="时间" width="170">
                                <template #default="{ row }">
                                    {{ formatTimestamp(row.createTime) }}
                                </template>
                            </el-table-column>
                            <el-table-column label="功能类型" width="120">
                                <template #default="{ row }">
                                    <el-tag
                                        size="small"
                                        :type="getFeatureTypeTagType(row.featureType)"
                                    >
                                        {{ getFeatureTypeLabel(row.featureType) }}
                                    </el-tag>
                                </template>
                            </el-table-column>
                            <el-table-column label="状态" width="90" align="center">
                                <template #default="{ row }">
                                    <el-tag
                                        size="small"
                                        :type="row.responseStatus === 'success' ? 'success' : 'danger'"
                                    >
                                        {{ row.responseStatus === 'success' ? '成功' : '失败' }}
                                    </el-tag>
                                </template>
                            </el-table-column>
                            <el-table-column
                                label="Token"
                                prop="tokensUsed"
                                width="100"
                                align="right"
                            />
                            <el-table-column
                                label="耗时(ms)"
                                prop="durationMs"
                                width="100"
                                align="right"
                            />
                            <el-table-column
                                label="请求内容"
                                prop="requestContent"
                                min-width="200"
                                show-overflow-tooltip
                            />
                            <el-table-column
                                label="错误信息"
                                prop="errorMessage"
                                min-width="160"
                                show-overflow-tooltip
                            >
                                <template #default="{ row }">
                                    <span v-if="row.errorMessage" class="text-red-500">{{
                                        row.errorMessage
                                    }}</span>
                                    <span v-else class="text-gray-300">—</span>
                                </template>
                            </el-table-column>
                        </el-table>

                        <!-- 分页 -->
                        <div class="mt-4 flex justify-end">
                            <el-pagination
                                v-model:current-page="logPagination.page"
                                v-model:page-size="logPagination.pageSize"
                                :total="logPagination.total"
                                :page-sizes="[10, 20, 50, 100]"
                                layout="total, sizes, prev, pager, next"
                                @current-change="loadLogList"
                                @size-change="handleLogPageSizeChange"
                            />
                        </div>
                    </div>
                </el-tab-pane>

                <!-- Tab 5: 功能开关 -->
                <el-tab-pane label="功能开关" name="toggle">
                    <div v-loading="toggleLoading" class="max-w-600">
                        <el-form label-width="140px" class="toggle-form">
                            <!-- 全局开关 -->
                            <el-card shadow="never" class="mb-4">
                                <div class="flex items-center justify-between">
                                    <div>
                                        <div class="text-base font-medium">AI 全局开关</div>
                                        <div class="text-gray-400 text-sm mt-1">
                                            关闭后将禁用所有 AI 功能，前端将隐藏 AI 相关入口
                                        </div>
                                    </div>
                                    <el-switch
                                        v-model="toggleForm.aiEnabled"
                                        active-text="开启"
                                        inactive-text="关闭"
                                    />
                                </div>
                            </el-card>

                            <!-- 子功能开关 -->
                            <el-card shadow="never">
                                <template #header>
                                    <span class="text-sm font-medium">功能模块开关</span>
                                </template>

                                <!-- AI 搜索 -->
                                <div class="toggle-item">
                                    <div class="toggle-item-info">
                                        <div class="toggle-item-title">AI 搜索</div>
                                        <div class="toggle-item-desc">
                                            启用后支持自然语言搜索理解和智能匹配排序
                                        </div>
                                    </div>
                                    <el-switch
                                        v-model="toggleForm.aiSearch"
                                        :disabled="!toggleForm.aiEnabled"
                                    />
                                </div>

                                <el-divider class="divider-my-12" />

                                <!-- AI 内容生成 -->
                                <div class="toggle-item">
                                    <div class="toggle-item-info">
                                        <div class="toggle-item-title">AI 内容生成</div>
                                        <div class="toggle-item-desc">
                                            启用后支持 AI 自动生成网站描述、标签等信息
                                        </div>
                                    </div>
                                    <el-switch
                                        v-model="toggleForm.aiGenerate"
                                        :disabled="!toggleForm.aiEnabled"
                                    />
                                </div>

                                <el-divider class="divider-my-12" />

                                <!-- AI 对话助手 -->
                                <div class="toggle-item">
                                    <div class="toggle-item-info">
                                        <div class="toggle-item-title">AI 对话助手</div>
                                        <div class="toggle-item-desc">
                                            启用后在前端详情页展示 AI 对话助手入口
                                        </div>
                                    </div>
                                    <el-switch
                                        v-model="toggleForm.aiChat"
                                        :disabled="!toggleForm.aiEnabled"
                                    />
                                </div>
                            </el-card>

                            <!-- 保存按钮 -->
                            <div class="mt-4">
                                <el-button
                                    type="primary"
                                    :loading="toggleSaveLoading"
                                    @click="handleSaveToggle"
                                >
                                    保存配置
                                </el-button>
                            </div>
                        </el-form>
                    </div>
                </el-tab-pane>
            </el-tabs>
        </el-card>

        <!-- 新增/编辑配置弹窗 -->
        <el-dialog
            v-model="showEditDialog"
            :title="editForm.id ? '编辑 AI 配置' : '新增 AI 配置'"
            width="600px"
            :close-on-click-modal="false"
        >
            <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="100px">
                <el-form-item label="配置名称" prop="name">
                    <el-input v-model="editForm.name" placeholder="请输入配置名称，如：主力配置" />
                </el-form-item>
                <el-form-item label="提供商" prop="provider">
                    <el-select
                        v-model="editForm.provider"
                        placeholder="请选择 AI 提供商"
                        class="w-100"
                    >
                        <el-option label="OpenAI" value="openai" />
                        <el-option label="Azure OpenAI" value="azure" />
                        <el-option label="Claude" value="claude" />
                        <el-option label="智谱 GLM" value="glm" />
                        <el-option label="Moonshot" value="moonshot" />
                        <el-option label="Kimi" value="kimi" />
                        <el-option label="Ollama" value="ollama" />
                        <el-option label="通义千问" value="qwen" />
                        <el-option label="文心一言" value="wenxin" />
                        <el-option label="SiliconFlow" value="siliconflow" />
                        <el-option label="DeepSeek" value="deepseek" />
                        <el-option label="其他" value="other" />
                    </el-select>
                </el-form-item>
                <el-form-item label="API 地址" prop="apiUrl">
                    <el-input
                        v-model="editForm.apiUrl"
                        placeholder="请输入 API 地址，如：https://api.siliconflow.cn/v1/chat/completions"
                    />
                </el-form-item>
                <el-form-item label="API 密钥" prop="apiKey">
                    <el-input
                        v-model="editForm.apiKey"
                        type="password"
                        show-password
                        placeholder="请输入 API 密钥"
                    />
                </el-form-item>
                <el-form-item label="模型" prop="model">
                    <div class="ai-model-field">
                        <el-select
                            v-model="editForm.model"
                            clearable
                            filterable
                            allow-create
                            default-first-option
                            placeholder="请选择或输入模型名称"
                            class="ai-model-field__select"
                        >
                            <el-option
                                v-for="item in getProviderMergedModelOptions(editForm.provider, editForm.model)"
                                :key="`${item.source}:${item.value}`"
                                :label="item.label"
                                :value="item.value"
                            >
                                <div class="ai-model-option">
                                    <span class="ai-model-option__label">{{ item.label }}</span>
                                    <el-tag
                                        size="small"
                                        effect="plain"
                                        :type="item.source === 'remote' ? 'success' : 'info'"
                                    >
                                        {{ item.source === 'remote' ? '接口' : '预设' }}
                                    </el-tag>
                                </div>
                            </el-option>
                        </el-select>
                        <el-button
                            type="primary"
                            plain
                            :loading="modelOptionsLoading"
                            @click="handleFetchProviderModels()"
                        >
                            拉取模型
                        </el-button>
                    </div>
                    <div class="text-xs text-gray-400 mt-2">
                        {{ currentProviderModelFetchSummary }}
                    </div>
                </el-form-item>
                <el-form-item label="模型预设">
                    <el-select
                        v-model="editForm.modelPreset"
                        clearable
                        filterable
                        placeholder="可选：从预设快速填充模型"
                        class="w-100"
                        @change="handleModelPresetChange"
                    >
                        <el-option
                            v-for="item in getProviderModelPresets(editForm.provider)"
                            :key="item.value"
                            :label="item.label"
                            :value="item.value"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item
                    v-if="getProviderModelPresets(editForm.provider).length"
                    label="快捷模型"
                >
                    <div class="ai-form-chip-wrap">
                        <el-button
                            v-for="item in getProviderModelPresets(editForm.provider)"
                            :key="item.value"
                            size="small"
                            plain
                            @click="applyModelPresetQuick(item.value)"
                        >
                            {{ item.label }}
                        </el-button>
                    </div>
                </el-form-item>
                <el-divider>思考模型（推理）</el-divider>
                <el-form-item v-if="editForm.provider === 'siliconflow'">
                    <el-alert type="info" :closable="false" show-icon class="ai-reasoning-alert">
                        <template #title>
                            SiliconFlow 推理能力配置（支持思考模型与 thinking budget）
                        </template>
                        <template #default>
                            <div class="ai-reasoning-alert__content">
                                <span>建议先用通用模型测试连通，再开启推理模型与思考预算。</span>
                                <el-button
                                    link
                                    type="primary"
                                    @click="openSiliconflowReasoningDocs"
                                >
                                    打开官方文档
                                </el-button>
                            </div>
                        </template>
                    </el-alert>
                </el-form-item>
                <el-form-item label="启用思考模型">
                    <el-switch v-model="editForm.reasoningEnabled" />
                    <span class="text-xs text-gray-400 ml-3">
                        启用后会向兼容接口附加推理参数（如 thinking_budget）
                    </span>
                </el-form-item>
                <el-form-item label="思考模型" v-if="editForm.reasoningEnabled">
                    <el-select
                        v-model="editForm.reasoningModel"
                        clearable
                        filterable
                        allow-create
                        default-first-option
                        placeholder="可选：覆盖主模型，使用推理模型"
                        class="w-100"
                    >
                        <el-option
                            v-for="
                                item in getProviderMergedReasoningOptions(
                                    editForm.provider,
                                    editForm.reasoningModel
                                )
                            "
                            :key="item.value"
                            :label="item.label"
                            :value="item.value"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item
                    label="快捷推理模型"
                    v-if="
                        editForm.reasoningEnabled &&
                        getProviderReasoningPresets(editForm.provider).length
                    "
                >
                    <div class="ai-form-chip-wrap">
                        <el-button
                            v-for="item in getProviderReasoningPresets(editForm.provider)"
                            :key="item.value"
                            size="small"
                            plain
                            @click="applyReasoningPresetQuick(item.value)"
                        >
                            {{ item.label }}
                        </el-button>
                    </div>
                </el-form-item>
                <el-form-item label="思考预算" v-if="editForm.reasoningEnabled">
                    <el-input-number
                        v-model="editForm.thinkingBudget"
                        :min="0"
                        :max="65536"
                        :step="128"
                    />
                    <span class="text-xs text-gray-400 ml-3">
                        0 表示不传该参数；建议先从 1024-4096 试起
                    </span>
                    <el-button
                        text
                        type="primary"
                        class="ml-8"
                        @click="applyReasoningBudgetPreset(2048)"
                    >
                        设为 2048
                    </el-button>
                    <el-button text type="primary" @click="applyReasoningBudgetPreset(4096)">
                        设为 4096
                    </el-button>
                </el-form-item>
                <el-row :gutter="16">
                    <el-col :span="12">
                        <el-form-item label="启用">
                            <el-switch v-model="editForm.enabled" />
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="设为默认">
                            <el-switch v-model="editForm.isDefault" />
                        </el-form-item>
                    </el-col>
                </el-row>
            </el-form>
            <template #footer>
                <el-button @click="showEditDialog = false">取消</el-button>
                <el-button
                    type="success"
                    :loading="testLoading"
                    :disabled="!editForm.apiKey"
                    @click="handleTestFromDialog"
                >
                    测试连接
                </el-button>
                <el-button type="primary" :loading="saveLoading" @click="handleSave">
                    确定
                </el-button>
            </template>
        </el-dialog>

        <el-dialog
            v-model="importPresetDialogVisible"
            :title="importPresetDialogMode === 'create' ? '新增模板预设' : '编辑模板预设'"
            width="680px"
            :close-on-click-modal="false"
            destroy-on-close
        >
            <el-form label-width="110px">
                <el-form-item label="所属模块">
                    <el-tag size="small" type="info">
                        {{
                            importPresetDialogModule === 'article'
                                ? '批量导入文章'
                                : '批量导入网址'
                        }}
                    </el-tag>
                </el-form-item>
                <el-form-item label="模板名称" required>
                    <el-input
                        v-model="importPresetDialogForm.name"
                        placeholder="请输入模板名称"
                        maxlength="60"
                        show-word-limit
                    />
                </el-form-item>
                <el-form-item label="模板说明">
                    <el-input
                        v-model="importPresetDialogForm.description"
                        placeholder="请输入模板说明（可选）"
                        maxlength="120"
                        show-word-limit
                    />
                </el-form-item>
                <el-form-item label="模型">
                    <el-select
                        v-model="importPresetDialogForm.model"
                        clearable
                        filterable
                        allow-create
                        default-first-option
                        class="w-100"
                        placeholder="留空则跟随默认模型"
                    >
                        <el-option
                            v-for="item in importModelOptions"
                            :key="`preset-model-${item.value}`"
                            :label="item.label"
                            :value="item.value"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item label="排序值">
                    <el-input-number
                        v-model="importPresetDialogForm.sort"
                        :min="1"
                        :max="9999"
                        :step="10"
                    />
                </el-form-item>
                <el-form-item label="启用状态">
                    <el-switch v-model="importPresetDialogForm.enabled" />
                </el-form-item>
                <el-form-item label="提示词模板" required>
                    <el-input
                        v-model="importPresetDialogForm.promptTemplate"
                        type="textarea"
                        :rows="10"
                        placeholder="请输入提示词模板"
                    />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="importPresetDialogVisible = false">取消</el-button>
                <el-button type="primary" @click="handleSubmitImportPresetDialog">保存</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts" name="uiedAiConfig">
/**
 * @file views/uied/aiConfig/index.vue
 * @description AI 助手管理页面 - 配置管理 Tab 完整实现
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 2.0.0
 */

import { ref, reactive, onMounted, nextTick, watch, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
    uiedAiConfigList,
    uiedAiConfigDetail,
    uiedAiConfigAdd,
    uiedAiConfigEdit,
    uiedAiConfigDelete,
    uiedAiConfigTest,
    uiedAiConfigModels,
    uiedAiConfigBatchGenerate,
    uiedAiConfigBatchConfirm,
    uiedWebsiteList,
    uiedAiUsageLogList,
    uiedAiUsageLogStats,
    uiedAiImportConfigGet,
    uiedAiImportConfigSave,
    uiedAiImportTemplatePresetsGet,
    uiedAiImportTemplatePresetsSave,
    uiedAiFeatureToggle,
    uiedAiSaveFeatureToggle
} from '@/api/uied'

// ==================== Tab 控制 ====================

const activeTab = ref('config')

// ==================== 提供商标签映射 ====================

const providerMap: Record<string, string> = {
    openai: 'OpenAI',
    azure: 'Azure OpenAI',
    claude: 'Claude',
    glm: '智谱 GLM',
    moonshot: 'Moonshot',
    kimi: 'Kimi',
    ollama: 'Ollama',
    qwen: '通义千问',
    wenxin: '文心一言',
    siliconflow: 'SiliconFlow',
    deepseek: 'DeepSeek',
    other: '其他'
}

type ProviderModelPreset = { label: string; value: string; model: string }
type RuntimeModelOption = { label: string; value: string; source: 'preset' | 'remote' }
type RemoteModelMeta = {
    source: 'remote' | 'fallback'
    total: number
    updatedAt: number
    message: string
    requestUrl: string
}

const providerModelPresetMap: Record<
    string,
    Array<ProviderModelPreset>
> = {
    siliconflow: [
        {
            label: 'SiliconFlow / DeepSeek-V3.2（通用）',
            value: 'siliconflow.chat.deepseek-v3.2',
            model: 'deepseek-ai/DeepSeek-V3.2'
        },
        {
            label: 'SiliconFlow / DeepSeek-R1（推理）',
            value: 'siliconflow.reasoning.deepseek-r1',
            model: 'deepseek-ai/DeepSeek-R1'
        },
        {
            label: 'SiliconFlow / Qwen3-32B（通用）',
            value: 'siliconflow.chat.qwen3-32b',
            model: 'Qwen/Qwen3-32B'
        },
        {
            label: 'SiliconFlow / Qwen3-14B（通用）',
            value: 'siliconflow.chat.qwen3-14b',
            model: 'Qwen/Qwen3-14B'
        },
        {
            label: 'SiliconFlow / GLM-4.5（通用）',
            value: 'siliconflow.chat.glm-4.5',
            model: 'zai-org/GLM-4.5'
        },
        {
            label: 'SiliconFlow / Llama-3.3-70B（通用）',
            value: 'siliconflow.chat.llama-3.3-70b',
            model: 'meta-llama/Llama-3.3-70B-Instruct'
        }
    ],
    deepseek: [
        { label: 'DeepSeek Chat', value: 'deepseek.chat', model: 'deepseek-chat' },
        { label: 'DeepSeek Reasoner', value: 'deepseek.reasoner', model: 'deepseek-reasoner' }
    ],
    openai: [
        { label: 'OpenAI / GPT-4.1', value: 'openai.gpt-4.1', model: 'gpt-4.1' },
        { label: 'OpenAI / GPT-4o-mini', value: 'openai.gpt-4o-mini', model: 'gpt-4o-mini' },
        { label: 'OpenAI / GPT-4o', value: 'openai.gpt-4o', model: 'gpt-4o' },
        { label: 'OpenAI / GPT-4.1-mini', value: 'openai.gpt-4.1-mini', model: 'gpt-4.1-mini' }
    ],
    qwen: [
        { label: 'Qwen Plus', value: 'qwen.plus', model: 'qwen-plus' },
        { label: 'Qwen Max', value: 'qwen.max', model: 'qwen-max' },
        { label: 'Qwen Turbo', value: 'qwen.turbo', model: 'qwen-turbo' }
    ],
    glm: [
        { label: 'GLM-4-Flash', value: 'glm.4.flash', model: 'glm-4-flash' },
        { label: 'GLM-4-Plus', value: 'glm.4.plus', model: 'glm-4-plus' }
    ],
    moonshot: [
        { label: 'Moonshot 8K', value: 'moonshot.8k', model: 'moonshot-v1-8k' },
        { label: 'Moonshot 32K', value: 'moonshot.32k', model: 'moonshot-v1-32k' }
    ],
    kimi: [
        { label: 'Kimi 8K', value: 'kimi.8k', model: 'moonshot-v1-8k' },
        { label: 'Kimi 32K', value: 'kimi.32k', model: 'moonshot-v1-32k' }
    ],
    ollama: [
        { label: 'qwen2.5:7b', value: 'ollama.qwen2.5.7b', model: 'qwen2.5:7b' },
        { label: 'llama3.1:8b', value: 'ollama.llama3.1.8b', model: 'llama3.1:8b' }
    ]
}

const providerReasoningPresetMap: Record<string, Array<{ label: string; value: string }>> = {
    siliconflow: [
        { label: 'DeepSeek-R1（推理）', value: 'deepseek-ai/DeepSeek-R1' },
        { label: 'Qwen3-32B（思考）', value: 'Qwen/Qwen3-32B' },
        { label: 'GLM-4.5（思考）', value: 'zai-org/GLM-4.5' }
    ],
    deepseek: [{ label: 'DeepSeek Reasoner', value: 'deepseek-reasoner' }],
    qwen: [{ label: 'Qwen Plus', value: 'qwen-plus' }],
    glm: [{ label: 'GLM-4-Plus', value: 'glm-4-plus' }]
}

const modelOptionsLoading = ref(false)
const providerRemoteModelMap = reactive<Record<string, Array<{ label: string; value: string }>>>({})
const providerModelFetchMetaMap = reactive<Record<string, RemoteModelMeta>>({})

const getProviderLabel = (provider: string): string => {
    return providerMap[provider] || provider || '未知'
}

/**
 * 规范化提供商标识
 */
const normalizeProviderKey = (provider: string) =>
    String(provider || '')
        .trim()
        .toLowerCase() || 'siliconflow'

/**
 * 获取当前提供商模型预设列表
 */
const getProviderModelPresets = (provider: string) => {
    const key = normalizeProviderKey(provider)
    return providerModelPresetMap[key] || []
}

/**
 * 获取当前提供商推理模型预设列表
 */
const getProviderReasoningPresets = (provider: string) => {
    const key = normalizeProviderKey(provider)
    return providerReasoningPresetMap[key] || []
}

/**
 * 合并“接口模型 + 预设模型”为下拉选项
 */
const getProviderMergedModelOptions = (provider: string, currentModel = ''): Array<RuntimeModelOption> => {
    const key = normalizeProviderKey(provider)
    const remoteOptions = Array.isArray(providerRemoteModelMap[key]) ? providerRemoteModelMap[key] : []
    const presetOptions = getProviderModelPresets(key).map((item) => ({
        label: item.model === item.label ? item.label : `${item.model}（预设）`,
        value: item.model,
        source: 'preset' as const
    }))
    const merged: Array<RuntimeModelOption> = []
    const dedup = new Set<string>()
    remoteOptions.forEach((item) => {
        const value = String(item?.value || '').trim()
        if (!value) return
        const dedupKey = value.toLowerCase()
        if (dedup.has(dedupKey)) return
        dedup.add(dedupKey)
        merged.push({
            label: String(item?.label || value).trim(),
            value,
            source: 'remote'
        })
    })
    presetOptions.forEach((item) => {
        const value = String(item.value || '').trim()
        if (!value) return
        const dedupKey = value.toLowerCase()
        if (dedup.has(dedupKey)) return
        dedup.add(dedupKey)
        merged.push(item)
    })
    const normalizedCurrentModel = String(currentModel || '').trim()
    if (normalizedCurrentModel && !dedup.has(normalizedCurrentModel.toLowerCase())) {
        merged.unshift({
            label: `${normalizedCurrentModel}（当前）`,
            value: normalizedCurrentModel,
            source: 'preset'
        })
    }
    return merged
}

/**
 * 合并推理模型选项（接口模型优先 + 推理预设）
 */
const getProviderMergedReasoningOptions = (
    provider: string,
    currentModel = ''
): Array<{ label: string; value: string }> => {
    const modelOptions = getProviderMergedModelOptions(provider, currentModel).map((item) => ({
        label: item.label,
        value: item.value
    }))
    const reasoningPresets = getProviderReasoningPresets(provider)
    const merged: Array<{ label: string; value: string }> = []
    const dedup = new Set<string>()
    modelOptions.forEach((item) => {
        const value = String(item.value || '').trim()
        if (!value) return
        const dedupKey = value.toLowerCase()
        if (dedup.has(dedupKey)) return
        dedup.add(dedupKey)
        merged.push(item)
    })
    reasoningPresets.forEach((item) => {
        const value = String(item.value || '').trim()
        if (!value) return
        const dedupKey = value.toLowerCase()
        if (dedup.has(dedupKey)) return
        dedup.add(dedupKey)
        merged.push(item)
    })
    return merged
}

// ==================== 配置列表 ====================

const configList = ref<any[]>([])
const configLoading = ref(false)

/**
 * 将值规范为布尔值
 */
const normalizeBoolean = (value: any, fallback = false): boolean => {
    if (value === undefined || value === null || value === '') return fallback
    if (typeof value === 'boolean') return value
    if (typeof value === 'number') return value === 1
    return ['1', 'true', 'yes', 'on'].includes(String(value).trim().toLowerCase())
}

/**
 * 统一配置项字段（兼容驼峰/下划线）
 */
const normalizeConfigItem = (row: any) => {
    const source = row && typeof row === 'object' ? row : {}
    return {
        id: Number(source.id || 0),
        name: String(source.name || ''),
        provider: String(source.provider || 'siliconflow'),
        apiUrl: String(source.apiUrl ?? source.api_url ?? ''),
        apiKey: String(source.apiKey ?? source.api_key ?? ''),
        model: String(source.model || ''),
        modelPreset: String(source.modelPreset || source.model_preset || ''),
        reasoningEnabled: normalizeBoolean(
            source.reasoningEnabled ?? source.reasoning_enabled,
            false
        ),
        reasoningModel: String(source.reasoningModel || source.reasoning_model || ''),
        thinkingBudget:
            Number.parseInt(String(source.thinkingBudget ?? source.thinking_budget ?? 0), 10) || 0,
        enabled: normalizeBoolean(source.enabled ?? source.is_enabled, true),
        isDefault: normalizeBoolean(source.isDefault ?? source.is_default, false),
        createdAt: source.createdAt ?? source.create_time ?? 0
    }
}

/** 加载配置列表 */
const loadConfigList = async () => {
    configLoading.value = true
    try {
        const res = await uiedAiConfigList()
        // API 返回可能为数组，或被包装在 list/lists/data 中
        const rawList = Array.isArray(res)
            ? res
            : res?.lists || res?.list || res?.data?.lists || res?.data?.list || res?.data || []
        configList.value = (Array.isArray(rawList) ? rawList : []).map((item) =>
            normalizeConfigItem(item)
        )
    } catch (error) {
        console.error('获取AI配置列表失败:', error)
        ElMessage.error('获取配置列表失败')
        configList.value = []
    } finally {
        configLoading.value = false
    }
}

// ==================== 启用/禁用切换 ====================

/** 切换配置启用状态 */
const handleToggleEnabled = async (row: any, val: boolean) => {
    try {
        await uiedAiConfigEdit({
            id: row.id,
            enabled: val
        })
        ElMessage.success(val ? '已启用' : '已禁用')
        loadConfigList()
    } catch (error) {
        console.error('切换启用状态失败:', error)
        ElMessage.error('操作失败')
    }
}

// ==================== 设置默认配置 ====================

/** 设置为默认配置 */
const handleSetDefault = async (row: any) => {
    try {
        await uiedAiConfigEdit({
            id: row.id,
            isDefault: true
        })
        ElMessage.success('已设为默认配置')
        loadConfigList()
    } catch (error) {
        console.error('设置默认配置失败:', error)
        ElMessage.error('操作失败')
    }
}

// ==================== 测试连接 ====================

const testLoading = ref(false)

/** 从表格行测试连接 */
const handleTestConnection = async (row: any) => {
    testLoading.value = true
    try {
        let sourceRow = row
        if (Number(row?.id || 0) > 0) {
            try {
                const detailRes = await uiedAiConfigDetail({ id: row.id })
                sourceRow = detailRes?.data || detailRes || row
            } catch (detailError) {
                console.warn('[uied.aiConfig] 测试连接获取详情失败，回退列表数据', detailError)
            }
        }
        const detail = normalizeConfigItem(sourceRow)
        await uiedAiConfigTest({
            provider: detail.provider,
            apiKey: detail.apiKey,
            apiUrl: detail.apiUrl,
            model: detail.model,
            reasoningEnabled: detail.reasoningEnabled,
            reasoningModel: detail.reasoningModel,
            thinkingBudget: detail.thinkingBudget
        })
        ElMessage.success('连接成功')
    } catch (error: any) {
        ElMessage.error(error?.msg || error?.message || '连接失败')
    } finally {
        testLoading.value = false
    }
}

/** 从弹窗中测试连接 */
const handleTestFromDialog = async () => {
    if (!editForm.apiKey) {
        ElMessage.warning('请先填写 API 密钥')
        return
    }
    testLoading.value = true
    try {
        await uiedAiConfigTest({
            provider: editForm.provider,
            apiKey: editForm.apiKey,
            apiUrl: editForm.apiUrl,
            model: editForm.model,
            reasoningEnabled: editForm.reasoningEnabled,
            reasoningModel: editForm.reasoningModel,
            thinkingBudget: editForm.thinkingBudget
        })
        ElMessage.success('连接成功')
    } catch (error: any) {
        ElMessage.error(error?.msg || error?.message || '连接失败')
    } finally {
        testLoading.value = false
    }
}

// ==================== 新增/编辑弹窗 ====================

const showEditDialog = ref(false)
const saveLoading = ref(false)
const editFormRef = ref<FormInstance>()

const editForm = reactive({
    id: 0,
    name: '',
    provider: 'siliconflow',
    apiUrl: '',
    apiKey: '',
    model: '',
    modelPreset: '',
    reasoningEnabled: false,
    reasoningModel: '',
    thinkingBudget: 0,
    enabled: true,
    isDefault: false
})

const editRules: FormRules = {
    name: [{ required: true, message: '请输入配置名称', trigger: 'blur' }],
    provider: [{ required: true, message: '请选择 AI 提供商', trigger: 'change' }],
    apiUrl: [{ required: true, message: '请输入 API 地址', trigger: 'blur' }],
    apiKey: [{ required: true, message: '请输入 API 密钥', trigger: 'blur' }],
    model: [{ required: true, message: '请输入模型名称', trigger: 'blur' }]
}

/**
 * 当前编辑提供商模型拉取摘要
 */
const currentProviderModelFetchSummary = computed(() => {
    const key = normalizeProviderKey(editForm.provider)
    const meta = providerModelFetchMetaMap[key]
    if (modelOptionsLoading.value) {
        return '正在拉取模型列表，请稍候...'
    }
    if (!meta) {
        return '点击「拉取模型」可从提供商接口获取最新模型列表，失败时会自动回退预设模型。'
    }
    const timeText = meta.updatedAt
        ? new Date(meta.updatedAt).toLocaleString('zh-CN', { hour12: false })
        : '-'
    const sourceText = meta.source === 'remote' ? '接口' : '预设回退'
    const detailText = meta.message ? `，${meta.message}` : ''
    return `最近同步：${timeText}，来源：${sourceText}，模型数：${meta.total}${detailText}`
})

/**
 * 规范化后端模型列表返回
 */
const normalizeRemoteModelRows = (rows: any): Array<{ label: string; value: string }> => {
    if (!Array.isArray(rows)) return []
    const dedup = new Set<string>()
    const result: Array<{ label: string; value: string }> = []
    rows.forEach((item) => {
        const value = String(item?.value || item?.id || item?.model || item?.name || '').trim()
        if (!value) return
        const dedupKey = value.toLowerCase()
        if (dedup.has(dedupKey)) return
        dedup.add(dedupKey)
        const label = String(item?.label || value).trim() || value
        result.push({ label, value })
    })
    return result
}

/**
 * 拉取当前提供商模型列表
 * @param options 额外参数（silent=true 时不弹成功提示）
 */
const handleFetchProviderModels = async (options: { silent?: boolean } = {}) => {
    const providerKey = normalizeProviderKey(editForm.provider)
    if (!String(editForm.apiKey || '').trim()) {
        ElMessage.warning('请先填写 API 密钥，再拉取模型列表')
        return
    }
    modelOptionsLoading.value = true
    try {
        const res = await uiedAiConfigModels({
            configId: editForm.id || undefined,
            provider: editForm.provider,
            apiUrl: editForm.apiUrl,
            apiKey: editForm.apiKey,
            type: 'text',
            subType: 'chat'
        })
        const data = res?.data || res || {}
        const rows = normalizeRemoteModelRows(data?.models || [])
        providerRemoteModelMap[providerKey] = rows
        providerModelFetchMetaMap[providerKey] = {
            source: data?.source === 'remote' ? 'remote' : 'fallback',
            total: Number(data?.total || rows.length),
            updatedAt: Date.now(),
            message: String(data?.message || '').trim(),
            requestUrl: String(data?.requestUrl || '').trim()
        }
        if (rows.length > 0 && !String(editForm.model || '').trim()) {
            editForm.model = rows[0].value
        }
        if (!options.silent) {
            if (data?.source === 'remote') {
                ElMessage.success(`已同步 ${rows.length} 个模型`)
            } else {
                ElMessage.warning(
                    data?.message || `接口拉取失败，已回退预设模型（${rows.length} 个）`
                )
            }
        }
    } catch (error: any) {
        console.error('拉取模型列表失败:', error)
        if (!options.silent) {
            ElMessage.error(error?.msg || error?.message || '拉取模型列表失败')
        }
    } finally {
        modelOptionsLoading.value = false
    }
}

/**
 * 获取提供商默认地址与模型
 */
const getProviderDefaults = (provider: string) => {
    const current = normalizeProviderKey(provider)
    const defaults: Record<string, { apiUrl: string; model: string; modelPreset: string }> = {
        siliconflow: {
            apiUrl: 'https://api.siliconflow.cn/v1/chat/completions',
            model: 'deepseek-ai/DeepSeek-V3.2',
            modelPreset: 'siliconflow.chat.deepseek-v3.2'
        },
        openai: {
            apiUrl: 'https://api.openai.com/v1/chat/completions',
            model: 'gpt-4o-mini',
            modelPreset: 'openai.gpt-4o-mini'
        },
        deepseek: {
            apiUrl: 'https://api.deepseek.com/v1/chat/completions',
            model: 'deepseek-chat',
            modelPreset: 'deepseek.chat'
        },
        qwen: {
            apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
            model: 'qwen-plus',
            modelPreset: 'qwen.plus'
        },
        glm: {
            apiUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
            model: 'glm-4-flash',
            modelPreset: 'glm.4.flash'
        },
        moonshot: {
            apiUrl: 'https://api.moonshot.cn/v1/chat/completions',
            model: 'moonshot-v1-8k',
            modelPreset: 'moonshot.8k'
        },
        kimi: {
            apiUrl: 'https://api.moonshot.cn/v1/chat/completions',
            model: 'moonshot-v1-8k',
            modelPreset: 'kimi.8k'
        },
        ollama: {
            apiUrl: 'http://127.0.0.1:11434/v1/chat/completions',
            model: 'qwen2.5:7b',
            modelPreset: 'ollama.qwen2.5.7b'
        }
    }
    return defaults[current] || defaults.siliconflow
}

/**
 * 按提供商填充默认地址和模型
 */
const applyProviderDefaults = (provider: string, force = false) => {
    const defaults = getProviderDefaults(provider)
    if (force || !String(editForm.apiUrl || '').trim()) {
        editForm.apiUrl = defaults.apiUrl
    }
    if (force || !String(editForm.model || '').trim()) {
        editForm.model = defaults.model
    }
    if (force || !String(editForm.modelPreset || '').trim()) {
        editForm.modelPreset = defaults.modelPreset
    }
}

/**
 * 应用模型预设到当前表单
 */
const handleModelPresetChange = (presetValue: string) => {
    const presets = getProviderModelPresets(editForm.provider)
    const matched = presets.find((item) => item.value === presetValue)
    if (!matched) return
    editForm.model = matched.model
}

/**
 * 快捷应用模型预设（用于按钮操作）
 */
const applyModelPresetQuick = (presetValue: string) => {
    editForm.modelPreset = presetValue
    handleModelPresetChange(presetValue)
}

/**
 * 快捷应用推理模型预设
 */
const applyReasoningPresetQuick = (model: string) => {
    editForm.reasoningEnabled = true
    editForm.reasoningModel = String(model || '').trim()
}

/**
 * 快捷设置思考预算预设值
 */
const applyReasoningBudgetPreset = (budget: number) => {
    editForm.reasoningEnabled = true
    editForm.thinkingBudget = Number(budget || 0)
}

/**
 * 打开 SiliconFlow 推理能力文档
 */
const openSiliconflowReasoningDocs = () => {
    window.open('https://docs.siliconflow.cn/cn/userguide/capabilities/reasoning', '_blank')
}

/** 重置编辑表单 */
const resetEditForm = () => {
    editForm.id = 0
    editForm.name = ''
    editForm.provider = 'siliconflow'
    editForm.apiUrl = ''
    editForm.apiKey = ''
    editForm.model = ''
    editForm.modelPreset = ''
    editForm.reasoningEnabled = false
    editForm.reasoningModel = ''
    editForm.thinkingBudget = 0
    editForm.enabled = true
    editForm.isDefault = false
    applyProviderDefaults(editForm.provider, true)
}

/** 新增配置 */
const handleAdd = () => {
    resetEditForm()
    showEditDialog.value = true
    // 等待 DOM 更新后清除表单验证状态
    nextTick(() => {
        editFormRef.value?.clearValidate()
    })
}

/** 编辑配置 */
const handleEdit = async (row: any) => {
    let sourceRow = row
    try {
        const detailRes = await uiedAiConfigDetail({ id: row?.id })
        sourceRow = detailRes?.data || detailRes || row
    } catch (error) {
        console.warn('[uied.aiConfig] 获取配置详情失败，回退使用列表数据', error)
    }
    const normalizedRow = normalizeConfigItem(sourceRow)
    resetEditForm()
    editForm.id = normalizedRow.id
    editForm.name = normalizedRow.name
    editForm.provider = normalizedRow.provider || 'siliconflow'
    editForm.apiUrl = normalizedRow.apiUrl
    editForm.apiKey = normalizedRow.apiKey
    editForm.model = normalizedRow.model
    editForm.modelPreset = normalizedRow.modelPreset || ''
    editForm.reasoningEnabled = !!normalizedRow.reasoningEnabled
    editForm.reasoningModel = normalizedRow.reasoningModel || ''
    editForm.thinkingBudget = Number(normalizedRow.thinkingBudget || 0)
    editForm.enabled = normalizedRow.enabled
    editForm.isDefault = normalizedRow.isDefault
    applyProviderDefaults(editForm.provider, false)
    showEditDialog.value = true
    nextTick(() => {
        editFormRef.value?.clearValidate()
    })
    const providerKey = normalizeProviderKey(editForm.provider)
    if (
        String(editForm.apiKey || '').trim() &&
        (!Array.isArray(providerRemoteModelMap[providerKey]) ||
            providerRemoteModelMap[providerKey].length === 0)
    ) {
        handleFetchProviderModels({ silent: true })
    }
}

/** 保存配置（新增或编辑） */
const handleSave = async () => {
    await editFormRef.value?.validate()
    saveLoading.value = true
    try {
        const submitData = {
            name: editForm.name,
            provider: editForm.provider,
            apiUrl: editForm.apiUrl,
            apiKey: editForm.apiKey,
            model: editForm.model,
            modelPreset: editForm.modelPreset,
            reasoningEnabled: editForm.reasoningEnabled,
            reasoningModel: editForm.reasoningModel,
            thinkingBudget: Number(editForm.thinkingBudget || 0),
            enabled: editForm.enabled,
            isDefault: editForm.isDefault
        }

        if (editForm.id) {
            await uiedAiConfigEdit({ id: editForm.id, ...submitData })
            ElMessage.success('编辑成功')
        } else {
            await uiedAiConfigAdd(submitData)
            ElMessage.success('新增成功')
        }
        showEditDialog.value = false
        loadConfigList()
    } catch (error) {
        console.error('保存配置失败:', error)
        ElMessage.error('保存失败')
    } finally {
        saveLoading.value = false
    }
}

// ==================== 删除配置 ====================

/** 删除配置 */
const handleDelete = async (row: any) => {
    try {
        await ElMessageBox.confirm(`确定要删除配置「${row.name}」吗？`, '删除确认', {
            type: 'warning'
        })
        await uiedAiConfigDelete({ id: row.id })
        ElMessage.success('删除成功')
        loadConfigList()
    } catch (error: any) {
        // 用户取消操作不提示错误
        if (error === 'cancel' || error?.toString?.().includes('cancel')) return
        console.error('删除配置失败:', error)
        ElMessage.error('删除失败')
    }
}

// ==================== 批量生成 ====================

/** 网站选择相关 */
const selectedWebsiteIds = ref<number[]>([])
const websiteOptions = ref<any[]>([])
const websiteSearchLoading = ref(false)

/** 生成字段选择 */
const selectedFields = ref<string[]>(['description', 'tags'])

/** 生成进度相关 */
const batchGenerating = ref(false)
const batchProgress = ref(0)
const batchCurrentName = ref('')
const batchProcessed = ref(0)
const batchTotal = ref(0)

/** 生成结果 */
const batchResults = ref<any[]>([])
const batchConfirmLoading = ref(false)

/** 搜索网站（远程搜索） */
const searchWebsites = async (query: string) => {
    if (!query && websiteOptions.value.length > 0) return
    websiteSearchLoading.value = true
    try {
        const res = await uiedWebsiteList({ keyword: query, pageSize: 50 })
        const data = res?.lists || res?.list || res?.data?.lists || res?.data?.list || []
        websiteOptions.value = Array.isArray(data) ? data : []
    } catch (error) {
        console.error('搜索网站失败:', error)
        websiteOptions.value = []
    } finally {
        websiteSearchLoading.value = false
    }
}

/** 网站选择器获得焦点时加载初始数据 */
const handleWebsiteSelectFocus = () => {
    if (websiteOptions.value.length === 0) {
        searchWebsites('')
    }
}

/** 开始批量生成 */
const handleBatchGenerate = async () => {
    if (selectedWebsiteIds.value.length === 0) {
        ElMessage.warning('请先选择网站')
        return
    }
    if (selectedFields.value.length === 0) {
        ElMessage.warning('请选择要生成的字段')
        return
    }

    batchGenerating.value = true
    batchProgress.value = 0
    batchProcessed.value = 0
    batchTotal.value = selectedWebsiteIds.value.length
    batchCurrentName.value = '准备中...'
    batchResults.value = []

    try {
        const res = await uiedAiConfigBatchGenerate({
            websiteIds: selectedWebsiteIds.value,
            fields: selectedFields.value
        })

        const data = res?.data || res
        const results = data?.results || []
        batchResults.value = results
        batchProcessed.value = results.length
        batchProgress.value = 100
        batchCurrentName.value = ''

        const successCount = results.filter((r: any) => r.status === 'success').length
        const failCount = results.length - successCount

        if (failCount === 0) {
            ElMessage.success(`批量生成完成，共 ${successCount} 个网站`)
        } else if (successCount === 0) {
            ElMessage.warning('批量生成全部失败，请检查 AI 配置')
        } else {
            ElMessage.warning(`批量生成完成：成功 ${successCount} 个，失败 ${failCount} 个`)
        }
    } catch (error: any) {
        console.error('批量生成失败:', error)
        ElMessage.error(error?.msg || error?.message || '批量生成失败，请检查 AI 配置')
    } finally {
        batchGenerating.value = false
    }
}

/** 确认保存批量生成结果 */
const handleBatchConfirm = async () => {
    // 只保存成功的结果
    const successResults = batchResults.value.filter((r) => r.status === 'success')
    if (successResults.length === 0) {
        ElMessage.warning('没有可保存的结果')
        return
    }

    batchConfirmLoading.value = true
    try {
        const confirmData = successResults.map((r) => ({
            websiteId: r.websiteId,
            description: r.description,
            tags: r.tags
        }))

        await uiedAiConfigBatchConfirm({ results: confirmData })
        ElMessage.success(`已保存 ${successResults.length} 个网站的生成结果`)
        handleBatchReset()
    } catch (error: any) {
        console.error('确认保存失败:', error)
        ElMessage.error(error?.msg || error?.message || '保存失败')
    } finally {
        batchConfirmLoading.value = false
    }
}

/** 重置批量生成状态 */
const handleBatchReset = () => {
    selectedWebsiteIds.value = []
    batchResults.value = []
    batchProgress.value = 0
    batchProcessed.value = 0
    batchTotal.value = 0
    batchCurrentName.value = ''
    batchGenerating.value = false
}

// ==================== 使用统计 ====================

/** 统计汇总数据 */
const statsData = reactive({
    totalCalls: 0,
    totalTokens: 0,
    successRate: 0,
    todayCalls: 0,
    failedCalls: 0,
    avgDurationMs: 0,
    avgTokensPerCall: 0,
    todaySuccessRate: 0,
    todayFailedCalls: 0,
    byFeature: [] as Array<{
        featureType: string
        calls: number
        tokens: number
        successRate: number
    }>
})

/** 日志筛选条件 */
const logFilter = reactive({
    featureType: '',
    responseStatus: '',
    dateRange: undefined as [string, string] | undefined
})

/** 日志分页 */
const logPagination = reactive({
    page: 1,
    pageSize: 20,
    total: 0
})

/** 日志列表 */
const logList = ref<any[]>([])
const logLoading = ref(false)

/**
 * 统计数据中的“功能分布”表格数据（按调用次数倒序）
 */
const featureStatsRows = computed(() =>
    (Array.isArray(statsData.byFeature) ? statsData.byFeature : [])
        .slice()
        .sort((a, b) => Number(b.calls || 0) - Number(a.calls || 0))
)

/** 功能类型标签映射 */
const featureTypeMap: Record<string, string> = {
    chat: 'AI 对话',
    generate: '内容生成',
    search: 'AI 搜索',
    batch_generate: '批量生成'
}

/** 获取功能类型中文标签 */
const getFeatureTypeLabel = (type: string): string => {
    return featureTypeMap[type] || type || '未知'
}

/** 获取功能类型标签颜色 */
const getFeatureTypeTagType = (type: string): '' | 'success' | 'warning' | 'info' | 'danger' => {
    const typeColorMap: Record<string, '' | 'success' | 'warning' | 'info' | 'danger'> = {
        chat: '',
        generate: 'success',
        search: 'warning',
        batch_generate: 'info'
    }
    return typeColorMap[type] || 'info'
}

/** 格式化 Unix 时间戳为可读时间 */
const formatTimestamp = (timestamp: number): string => {
    if (!timestamp) return '—'
    const date = new Date(timestamp * 1000)
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    const h = String(date.getHours()).padStart(2, '0')
    const min = String(date.getMinutes()).padStart(2, '0')
    const s = String(date.getSeconds()).padStart(2, '0')
    return `${y}-${m}-${d} ${h}:${min}:${s}`
}

/**
 * 规范化日志行，兼容后端驼峰与下划线字段
 */
const normalizeUsageLogItem = (item: any) => ({
    id: Number(item?.id || 0),
    configId: Number(item?.configId ?? item?.config_id ?? 0),
    featureType: String(item?.featureType ?? item?.feature_type ?? ''),
    requestContent: String(item?.requestContent ?? item?.request_content ?? ''),
    responseStatus: String(item?.responseStatus ?? item?.response_status ?? 'success'),
    errorMessage: String(item?.errorMessage ?? item?.error_message ?? ''),
    tokensUsed: Number(item?.tokensUsed ?? item?.tokens_used ?? 0),
    durationMs: Number(item?.durationMs ?? item?.duration_ms ?? 0),
    createTime: Number(item?.createTime ?? item?.create_time ?? 0)
})

/**
 * 规范化“功能分布”统计行
 */
const normalizeFeatureStats = (rows: any): Array<{
    featureType: string
    calls: number
    tokens: number
    successRate: number
}> => {
    if (!Array.isArray(rows)) return []
    return rows.map((item) => ({
        featureType: String(item?.featureType ?? item?.feature_type ?? ''),
        calls: Number(item?.calls ?? 0),
        tokens: Number(item?.tokens ?? 0),
        successRate: Number(item?.successRate ?? item?.success_rate ?? 0)
    }))
}

/** 加载统计汇总数据 */
const loadStats = async () => {
    try {
        const res = await uiedAiUsageLogStats()
        const data = res?.data || res || {}
        statsData.totalCalls = Number(data.totalCalls ?? 0)
        statsData.totalTokens = Number(data.totalTokens ?? 0)
        statsData.successRate = Number(data.successRate ?? 0)
        statsData.todayCalls = Number(data.todayCalls ?? 0)
        statsData.failedCalls = Number(data.failedCalls ?? 0)
        statsData.avgDurationMs = Number(data.avgDurationMs ?? 0)
        statsData.avgTokensPerCall = Number(data.avgTokensPerCall ?? 0)
        statsData.todaySuccessRate = Number(data.todaySuccessRate ?? 0)
        statsData.todayFailedCalls = Number(data.todayFailedCalls ?? 0)
        statsData.byFeature = normalizeFeatureStats(data.byFeature || Object.values(data.byType || {}))
    } catch (error) {
        console.error('获取使用统计失败:', error)
        statsData.totalCalls = 0
        statsData.totalTokens = 0
        statsData.successRate = 0
        statsData.todayCalls = 0
        statsData.failedCalls = 0
        statsData.avgDurationMs = 0
        statsData.avgTokensPerCall = 0
        statsData.todaySuccessRate = 0
        statsData.todayFailedCalls = 0
        statsData.byFeature = []
    }
}

/** 加载日志列表 */
const loadLogList = async () => {
    logLoading.value = true
    try {
        const params: any = {
            pageNo: logPagination.page,
            pageSize: logPagination.pageSize
        }
        // 按功能类型筛选
        if (logFilter.featureType) {
            params.featureType = logFilter.featureType
            params.feature_type = logFilter.featureType
        }
        // 按状态筛选
        if (logFilter.responseStatus) {
            params.responseStatus = logFilter.responseStatus
            params.response_status = logFilter.responseStatus
        }
        // 按时间范围筛选
        if (logFilter.dateRange && logFilter.dateRange.length === 2) {
            params.startDate = logFilter.dateRange[0]
            params.endDate = logFilter.dateRange[1]
            params.start_time = logFilter.dateRange[0]
            params.end_time = logFilter.dateRange[1]
        }

        const res = await uiedAiUsageLogList(params)
        const data = res?.data || res || {}
        const rows = data?.lists || data?.list || []
        logList.value = (Array.isArray(rows) ? rows : []).map((item: any) => normalizeUsageLogItem(item))
        logPagination.total = Number(data?.count ?? data?.total ?? 0)
    } catch (error) {
        console.error('获取使用日志失败:', error)
        logList.value = []
        logPagination.total = 0
    } finally {
        logLoading.value = false
    }
}

/** 筛选条件变化时重新加载 */
const handleLogFilterChange = () => {
    logPagination.page = 1
    loadLogList()
}

/** 分页大小变化 */
const handleLogPageSizeChange = () => {
    logPagination.page = 1
    loadLogList()
}

// ==================== 导入配置 ====================

type ImportModuleType = 'article' | 'website'
type PresetDialogMode = 'create' | 'edit'

type AiImportModuleConfig = {
    enabled: boolean
    model: string
    promptTemplate: string
}

type AiImportNetworkConfig = {
    allowInsecureTls: boolean
    insecureDomains: string[]
}

type ImportTemplatePreset = {
    id: string
    name: string
    description: string
    model: string
    promptTemplate: string
    sort: number
    enabled: boolean
}

type AiImportConfigForm = {
    articleBatchImport: AiImportModuleConfig
    websiteBatchImport: AiImportModuleConfig
    network: AiImportNetworkConfig
}

const DEFAULT_IMPORT_INSECURE_DOMAINS = [
    'mp.weixin.qq.com',
    'weixin.qq.com',
    'mmbiz.qpic.cn',
    'mmbiz.qlogo.cn',
    'res.wx.qq.com'
]

const DEFAULT_ARTICLE_IMPORT_PROMPT = `请基于以下公众号文章内容进行专业润色，并直接返回 HTML 正文，不要输出 \`\`\` 代码块。

原始标题：{title}
原始简介：{intro}
作者：{author}
来源链接：{sourceUrl}
原始正文：
{content}

要求：
1. 保留原文核心事实，不编造信息；
2. 优化结构与可读性，可适当增加小标题（h2/h3）；
3. 输出为可直接入库的 HTML 正文；
4. 正文建议 600-2000 字；`
const DEFAULT_WEBSITE_IMPORT_PROMPT = `请为以下网站生成一篇详细的介绍内容，用于网站详情页展示。请直接返回 HTML 格式内容，不要包含 \`\`\` 代码块标记。

网站名称: {websiteName}
网站URL: {websiteUrl}
网站描述: {websiteDescription}
标签: {websiteTags}

要求：
1. 使用 HTML 标签格式化内容（h2, h3, p, ul, li, strong 等）
2. 内容包含：网站简介、主要功能/特点、适用人群、使用场景
3. 内容长度 300-600 字
4. 语言风格专业但易读
5. 不要包含虚假信息，基于网站名称和描述合理推断`

/**
 * 创建默认模板库（文章/网址），用于首屏和异常兜底。
 */
const createDefaultImportTemplatePresets = (): Record<ImportModuleType, ImportTemplatePreset[]> => ({
    article: [
        {
            id: 'article_default',
            name: '标准润色',
            description: '保持事实不变，增强可读性',
            model: '',
            promptTemplate: DEFAULT_ARTICLE_IMPORT_PROMPT,
            sort: 10,
            enabled: true
        },
        {
            id: 'article_seo',
            name: 'SEO 优化',
            description: '增强关键词与结构化标题',
            model: '',
            promptTemplate: `${DEFAULT_ARTICLE_IMPORT_PROMPT}

额外要求：
5. 在不堆砌关键词的前提下提升 SEO 友好性；
6. 标题与段落中自然包含核心关键词。`,
            sort: 20,
            enabled: true
        },
        {
            id: 'article_brief',
            name: '精简快读',
            description: '适合快节奏阅读场景',
            model: '',
            promptTemplate: `请将以下公众号文章整理为“精简快读版”，并直接返回 HTML 正文，不要输出 \`\`\` 代码块。

标题：{title}
简介：{intro}
作者：{author}
来源：{sourceUrl}
正文：
{content}

要求：
1. 保留核心事实，不编造信息；
2. 结构为：导语 + 3~5 个重点小节 + 结论；
3. 使用 h2/h3/p/ul/li 等 HTML 标签；
4. 总字数控制在 500-1000 字。`,
            sort: 30,
            enabled: true
        }
    ],
    website: [
        {
            id: 'website_default',
            name: '标准介绍',
            description: '通用的详情页介绍结构',
            model: '',
            promptTemplate: DEFAULT_WEBSITE_IMPORT_PROMPT,
            sort: 10,
            enabled: true
        },
        {
            id: 'website_conversion',
            name: '转化导向',
            description: '突出价值卖点和使用收益',
            model: '',
            promptTemplate: `${DEFAULT_WEBSITE_IMPORT_PROMPT}

额外要求：
6. 强调用户收益、效率提升与典型使用价值；
7. 结尾增加“适合人群”与“推荐理由”小节。`,
            sort: 20,
            enabled: true
        },
        {
            id: 'website_enterprise',
            name: '企业评估',
            description: '适合 B 端选型场景',
            model: '',
            promptTemplate: `请为以下网站生成“企业选型评估版”介绍，直接返回 HTML 正文，不要输出 \`\`\` 代码块。

网站名称: {websiteName}
网站URL: {websiteUrl}
网站描述: {websiteDescription}
标签: {websiteTags}

要求：
1. 结构包含：产品定位、核心能力、接入与部署、适用场景、风险与限制；
2. 使用 h2/h3/p/ul/li/table 等 HTML 标签；
3. 语言专业客观，避免夸张表述；
4. 正文长度 400-900 字。`,
            sort: 30,
            enabled: true
        }
    ]
})

/**
 * 创建导入配置默认值，确保页面首屏与接口异常时均可稳定回退。
 */
const createDefaultImportConfig = (): AiImportConfigForm => ({
    articleBatchImport: {
        enabled: true,
        model: '',
        promptTemplate: DEFAULT_ARTICLE_IMPORT_PROMPT
    },
    websiteBatchImport: {
        enabled: true,
        model: '',
        promptTemplate: DEFAULT_WEBSITE_IMPORT_PROMPT
    },
    network: {
        allowInsecureTls: true,
        insecureDomains: [...DEFAULT_IMPORT_INSECURE_DOMAINS]
    }
})

const importConfigForm = reactive<AiImportConfigForm>(createDefaultImportConfig())
const importConfigLoading = ref(false)
const importConfigSaveLoading = ref(false)
const importTemplatePresetsSaveLoading = ref(false)
const selectedArticlePresetId = ref('')
const selectedWebsitePresetId = ref('')
const lastSavedImportConfig = ref<AiImportConfigForm>(createDefaultImportConfig())
const articleImportPresetList = ref<ImportTemplatePreset[]>([])
const websiteImportPresetList = ref<ImportTemplatePreset[]>([])
const importInsecureDomainSuggestions = [...DEFAULT_IMPORT_INSECURE_DOMAINS]

const importPresetDialogVisible = ref(false)
const importPresetDialogMode = ref<PresetDialogMode>('create')
const importPresetDialogModule = ref<ImportModuleType>('article')
const importPresetDialogEditId = ref('')
const importPresetDialogForm = reactive<ImportTemplatePreset>({
    id: '',
    name: '',
    description: '',
    model: '',
    promptTemplate: '',
    sort: 10,
    enabled: true
})

/**
 * 导入模块可选模型：实时来自“AI 配置管理”里的模型列表。
 */
const importModelOptions = computed(() => {
    const rows = Array.isArray(configList.value) ? configList.value : []
    const dedup = new Set<string>()
    const options: Array<{ label: string; value: string }> = []

    /**
     * 写入单个模型选项，自动去重并附带来源说明。
     */
    const pushModelOption = (modelName: string, providerName: string, isDefault: boolean, suffix = '主模型') => {
        const normalizedName = String(modelName || '').trim()
        if (!normalizedName) return
        const dedupKey = normalizedName.toLowerCase()
        if (dedup.has(dedupKey)) return
        dedup.add(dedupKey)
        options.push({
            label: `${normalizedName}${providerName ? `（${providerName} · ${suffix}${isDefault ? ' · 默认配置' : ''}）` : ''}`,
            value: normalizedName
        })
    }

    rows.forEach((item: any) => {
        const providerName = getProviderLabel(String(item?.provider || '').trim())
        const isDefault = item?.isDefault === true || Number(item?.isDefault || 0) === 1
        pushModelOption(String(item?.model || ''), providerName, isDefault, '主模型')
        pushModelOption(String(item?.reasoningModel || ''), providerName, isDefault, '推理模型')
    })

    return options
})

/**
 * 规范化单个导入模块配置，兼容后端历史字段命名。
 */
const normalizeImportModuleConfig = (
    source: any,
    fallback: AiImportModuleConfig
): AiImportModuleConfig => ({
    enabled: source?.enabled !== false,
    model: String(source?.model || source?.aiModel || fallback.model || '').trim(),
    promptTemplate: String(
        source?.promptTemplate || source?.aiPromptTemplate || fallback.promptTemplate || ''
    ).trim()
})

/**
 * 规范化导入网络域名白名单，兼容数组/文本输入。
 */
const normalizeInsecureDomainList = (source: any, fallback: string[] = []): string[] => {
    const rawList = Array.isArray(source) ? source : String(source || '').split(/[\n,;\s]+/)
    const list = rawList
        .map((item: any) => String(item || '').trim().toLowerCase())
        .filter(Boolean)
        .map((item) => item.replace(/^https?:\/\//, ''))
        .map((item) => item.replace(/\/+$/, ''))
        .filter((item) => /^[a-z0-9.-]+$/.test(item))
    const merged = list.length
        ? list
        : (Array.isArray(fallback)
              ? fallback.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean)
              : [])
    return Array.from(new Set(merged))
}

/**
 * 规范化导入网络配置（证书容错开关 + 域名白名单）。
 */
const normalizeImportNetworkConfig = (
    source: any,
    fallback: AiImportNetworkConfig
): AiImportNetworkConfig => ({
    allowInsecureTls:
        source?.allowInsecureTls !== undefined
            ? Boolean(source?.allowInsecureTls)
            : Boolean(fallback.allowInsecureTls),
    insecureDomains: normalizeInsecureDomainList(source?.insecureDomains, fallback.insecureDomains)
})

/**
 * 深拷贝导入配置，避免引用地址导致“已保存状态”计算失真。
 */
const cloneImportConfig = (config: AiImportConfigForm): AiImportConfigForm =>
    JSON.parse(JSON.stringify(config))

/**
 * 深拷贝模板列表，防止引用污染。
 */
const cloneImportTemplatePresetList = (list: ImportTemplatePreset[]): ImportTemplatePreset[] =>
    JSON.parse(JSON.stringify(Array.isArray(list) ? list : []))

/**
 * 构建提交给后端的导入配置载荷（统一去空格）。
 */
const buildImportConfigPayload = (): AiImportConfigForm => ({
    articleBatchImport: {
        enabled: importConfigForm.articleBatchImport.enabled,
        model: String(importConfigForm.articleBatchImport.model || '').trim(),
        promptTemplate: String(importConfigForm.articleBatchImport.promptTemplate || '').trim()
    },
    websiteBatchImport: {
        enabled: importConfigForm.websiteBatchImport.enabled,
        model: String(importConfigForm.websiteBatchImport.model || '').trim(),
        promptTemplate: String(importConfigForm.websiteBatchImport.promptTemplate || '').trim()
    },
    network: {
        allowInsecureTls: importConfigForm.network.allowInsecureTls === true,
        insecureDomains: normalizeInsecureDomainList(
            importConfigForm.network.insecureDomains,
            DEFAULT_IMPORT_INSECURE_DOMAINS
        )
    }
})

/**
 * 同步“已保存快照”，用于判断当前配置是否有未保存改动。
 */
const syncLastSavedImportConfig = () => {
    lastSavedImportConfig.value = cloneImportConfig(buildImportConfigPayload())
}

/**
 * 判断导入配置是否发生未保存变更。
 */
const isImportConfigChanged = computed(() => {
    const currentPayload = buildImportConfigPayload()
    return JSON.stringify(currentPayload) !== JSON.stringify(lastSavedImportConfig.value)
})

/**
 * 根据模块读取对应导入配置对象。
 */
const getImportModuleConfig = (module: ImportModuleType): AiImportModuleConfig =>
    module === 'article' ? importConfigForm.articleBatchImport : importConfigForm.websiteBatchImport

/**
 * 根据模块读取默认导入配置对象。
 */
const getDefaultImportModuleConfig = (module: ImportModuleType): AiImportModuleConfig => {
    const defaults = createDefaultImportConfig()
    return module === 'article' ? defaults.articleBatchImport : defaults.websiteBatchImport
}

/**
 * 根据模块获取模板列表引用。
 */
const getImportPresetListByModule = (module: ImportModuleType): ImportTemplatePreset[] =>
    module === 'article' ? articleImportPresetList.value : websiteImportPresetList.value

/**
 * 写入模块模板列表。
 */
const setImportPresetListByModule = (module: ImportModuleType, list: ImportTemplatePreset[]) => {
    const normalized = cloneImportTemplatePresetList(list)
    if (module === 'article') {
        articleImportPresetList.value = normalized
        return
    }
    websiteImportPresetList.value = normalized
}

/**
 * 规范化模板项，兼容后端结构与前端编辑态。
 */
const normalizeImportPresetItem = (
    item: any,
    module: ImportModuleType,
    index: number
): ImportTemplatePreset => {
    const defaults = createDefaultImportTemplatePresets()[module]
    const fallback = defaults[index] || defaults[0]
    const fallbackId = `${module}_preset_${index + 1}`
    return {
        id: String(item?.id || fallback?.id || fallbackId).trim().slice(0, 64) || fallbackId,
        name: String(item?.name || fallback?.name || `模板 ${index + 1}`).trim().slice(0, 60),
        description: String(item?.description || fallback?.description || '')
            .trim()
            .slice(0, 120),
        model: String(item?.model || fallback?.model || '').trim().slice(0, 120),
        promptTemplate: String(item?.promptTemplate || fallback?.promptTemplate || '')
            .trim()
            .slice(0, 12000),
        sort: Number.isFinite(Number(item?.sort)) ? Number(item.sort) : (index + 1) * 10,
        enabled: item?.enabled !== false
    }
}

/**
 * 规范化模板列表：去重、排序、重新生成 sort。
 */
const normalizeImportPresetList = (
    list: any,
    module: ImportModuleType
): ImportTemplatePreset[] => {
    const source = Array.isArray(list) ? list : []
    const normalized = source.map((item, index) => normalizeImportPresetItem(item, module, index))
    const fallback = createDefaultImportTemplatePresets()[module]
    const baseList = normalized.length > 0 ? normalized : cloneImportTemplatePresetList(fallback)
    const idSet = new Set<string>()
    const deduped = baseList.map((item, index) => {
        let nextId = String(item.id || '').trim()
        if (!nextId || idSet.has(nextId)) {
            nextId = `${module}_preset_${index + 1}`
        }
        idSet.add(nextId)
        return { ...item, id: nextId }
    })
    return deduped
        .sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0))
        .map((item, index) => ({ ...item, sort: (index + 1) * 10 }))
}

/**
 * 应用后端返回的模板库配置到本地状态。
 */
const applyImportTemplatePresets = (payload: any) => {
    const article = normalizeImportPresetList(payload?.article, 'article')
    const website = normalizeImportPresetList(payload?.website, 'website')
    setImportPresetListByModule('article', article)
    setImportPresetListByModule('website', website)

    if (!article.some((item) => item.id === selectedArticlePresetId.value)) {
        selectedArticlePresetId.value = ''
    }
    if (!website.some((item) => item.id === selectedWebsitePresetId.value)) {
        selectedWebsitePresetId.value = ''
    }
}

/**
 * 构建模板库存储载荷。
 */
const buildImportTemplatePresetsPayload = () => ({
    article: normalizeImportPresetList(articleImportPresetList.value, 'article').map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        model: item.model,
        promptTemplate: item.promptTemplate,
        sort: item.sort,
        enabled: item.enabled
    })),
    website: normalizeImportPresetList(websiteImportPresetList.value, 'website').map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        model: item.model,
        promptTemplate: item.promptTemplate,
        sort: item.sort,
        enabled: item.enabled
    }))
})

/**
 * 加载导入模板库（来自后端可配置项）。
 */
const loadImportTemplatePresets = async () => {
    try {
        const res = await uiedAiImportTemplatePresetsGet()
        const data = res?.data || res || {}
        applyImportTemplatePresets(data)
    } catch (error) {
        console.error('获取导入模板库失败:', error)
        applyImportTemplatePresets({})
        ElMessage.error('获取导入模板库失败，已回退默认模板')
    }
}

/**
 * 保存导入模板库（增删改排序统一提交）。
 */
const handleSaveImportTemplatePresets = async () => {
    importTemplatePresetsSaveLoading.value = true
    try {
        const payload = buildImportTemplatePresetsPayload()
        await uiedAiImportTemplatePresetsSave(payload)
        applyImportTemplatePresets(payload)
        ElMessage.success('模板库已保存')
    } catch (error: any) {
        console.error('保存导入模板库失败:', error)
        ElMessage.error(error?.msg || error?.message || '保存模板库失败')
    } finally {
        importTemplatePresetsSaveLoading.value = false
    }
}

/**
 * 重置模板弹窗表单。
 */
const resetImportPresetDialogForm = () => {
    importPresetDialogForm.id = ''
    importPresetDialogForm.name = ''
    importPresetDialogForm.description = ''
    importPresetDialogForm.model = ''
    importPresetDialogForm.promptTemplate = ''
    importPresetDialogForm.sort = 10
    importPresetDialogForm.enabled = true
}

/**
 * 打开模板编辑弹窗（新增/编辑）。
 */
const handleOpenImportPresetDialog = (module: ImportModuleType, row?: ImportTemplatePreset) => {
    importPresetDialogModule.value = module
    if (row) {
        importPresetDialogMode.value = 'edit'
        importPresetDialogEditId.value = String(row.id || '')
        importPresetDialogForm.id = String(row.id || '')
        importPresetDialogForm.name = String(row.name || '')
        importPresetDialogForm.description = String(row.description || '')
        importPresetDialogForm.model = String(row.model || '')
        importPresetDialogForm.promptTemplate = String(row.promptTemplate || '')
        importPresetDialogForm.sort = Number(row.sort || 10)
        importPresetDialogForm.enabled = row.enabled !== false
    } else {
        importPresetDialogMode.value = 'create'
        importPresetDialogEditId.value = ''
        resetImportPresetDialogForm()
        const currentList = getImportPresetListByModule(module)
        importPresetDialogForm.sort = (currentList.length + 1) * 10
        importPresetDialogForm.enabled = true
        const defaults = createDefaultImportTemplatePresets()[module]
        importPresetDialogForm.promptTemplate = String(defaults[0]?.promptTemplate || '').trim()
    }
    importPresetDialogVisible.value = true
}

/**
 * 提交模板弹窗（新增或编辑）。
 */
const handleSubmitImportPresetDialog = () => {
    const module = importPresetDialogModule.value
    const name = String(importPresetDialogForm.name || '').trim()
    const promptTemplate = String(importPresetDialogForm.promptTemplate || '').trim()
    if (!name) {
        ElMessage.warning('请输入模板名称')
        return
    }
    if (!promptTemplate) {
        ElMessage.warning('请输入提示词模板')
        return
    }
    const targetList = cloneImportTemplatePresetList(getImportPresetListByModule(module))
    const payloadItem: ImportTemplatePreset = normalizeImportPresetItem(
        {
            id: importPresetDialogForm.id,
            name,
            description: String(importPresetDialogForm.description || '').trim(),
            model: String(importPresetDialogForm.model || '').trim(),
            promptTemplate,
            sort: Number(importPresetDialogForm.sort || 10),
            enabled: importPresetDialogForm.enabled
        },
        module,
        targetList.length
    )
    if (importPresetDialogMode.value === 'edit') {
        const editId = String(importPresetDialogEditId.value || '').trim()
        const rowIndex = targetList.findIndex((item) => item.id === editId)
        if (rowIndex < 0) {
            ElMessage.warning('当前模板不存在，请刷新后重试')
            return
        }
        targetList[rowIndex] = { ...payloadItem, id: editId || payloadItem.id }
    } else {
        payloadItem.id = payloadItem.id || `${module}_preset_${Date.now()}`
        targetList.push(payloadItem)
    }
    const normalized = normalizeImportPresetList(targetList, module)
    setImportPresetListByModule(module, normalized)
    importPresetDialogVisible.value = false
    ElMessage.success(importPresetDialogMode.value === 'create' ? '模板已新增' : '模板已更新')
}

/**
 * 删除模板。
 */
const handleDeleteImportPreset = async (module: ImportModuleType, row: ImportTemplatePreset) => {
    const currentList = getImportPresetListByModule(module)
    if (currentList.length <= 1) {
        ElMessage.warning('至少保留 1 个模板预设')
        return
    }
    try {
        await ElMessageBox.confirm(`确认删除模板「${row.name}」吗？`, '删除模板', {
            type: 'warning',
            confirmButtonText: '删除',
            cancelButtonText: '取消'
        })
    } catch (error) {
        return
    }
    const filtered = currentList.filter((item) => item.id !== row.id)
    const normalized = normalizeImportPresetList(filtered, module)
    setImportPresetListByModule(module, normalized)
    if (module === 'article' && selectedArticlePresetId.value === row.id) {
        selectedArticlePresetId.value = ''
    }
    if (module === 'website' && selectedWebsitePresetId.value === row.id) {
        selectedWebsitePresetId.value = ''
    }
    ElMessage.success('模板已删除')
}

/**
 * 调整模板顺序（上移/下移）。
 */
const handleMoveImportPreset = (
    module: ImportModuleType,
    index: number,
    direction: 'up' | 'down'
) => {
    const sourceList = cloneImportTemplatePresetList(getImportPresetListByModule(module))
    const offset = direction === 'up' ? -1 : 1
    const targetIndex = index + offset
    if (targetIndex < 0 || targetIndex >= sourceList.length) return
    const current = sourceList[index]
    sourceList[index] = sourceList[targetIndex]
    sourceList[targetIndex] = current
    const normalized = normalizeImportPresetList(
        sourceList.map((item, rowIndex) => ({ ...item, sort: (rowIndex + 1) * 10 })),
        module
    )
    setImportPresetListByModule(module, normalized)
}

/**
 * 根据模块与预设 ID 查找模板预设。
 */
const findImportPreset = (module: ImportModuleType, presetId: string): ImportTemplatePreset | null => {
    const list = getImportPresetListByModule(module)
    const matched = list.find((item) => item.id === presetId)
    return matched || null
}

/**
 * 应用模板预设到指定模块。
 */
const applyImportPresetToModule = (module: ImportModuleType, preset: ImportTemplatePreset) => {
    const targetModule = getImportModuleConfig(module)
    targetModule.model = String(preset.model || '').trim()
    targetModule.promptTemplate = String(preset.promptTemplate || '').trim()
}

/**
 * 点击“应用预设”后的处理逻辑。
 */
const handleApplyImportPreset = (module: ImportModuleType) => {
    const presetId = module === 'article' ? selectedArticlePresetId.value : selectedWebsitePresetId.value
    if (!presetId) {
        ElMessage.warning('请先选择模板预设')
        return
    }
    const preset = findImportPreset(module, presetId)
    if (!preset) {
        ElMessage.warning('未找到对应模板预设，请重新选择')
        return
    }
    applyImportPresetToModule(module, preset)
    ElMessage.success(`已应用“${preset.name}”预设`)
}

/**
 * 恢复指定模块为默认模板（仅重置模型与提示词，不修改开关状态）。
 */
const handleResetImportModuleToDefault = async (module: ImportModuleType) => {
    try {
        await ElMessageBox.confirm('确认恢复该模块的默认模板吗？', '恢复默认', {
            type: 'warning',
            confirmButtonText: '恢复',
            cancelButtonText: '取消'
        })
    } catch (error) {
        return
    }
    const targetModule = getImportModuleConfig(module)
    const defaultModule = getDefaultImportModuleConfig(module)
    targetModule.model = String(defaultModule.model || '').trim()
    targetModule.promptTemplate = String(defaultModule.promptTemplate || '').trim()
    if (module === 'article') selectedArticlePresetId.value = ''
    if (module === 'website') selectedWebsitePresetId.value = ''
    ElMessage.success('已恢复默认模板')
}

/**
 * 一键恢复全部默认模板（仅重置模型与提示词，不修改开关状态）。
 */
const handleResetAllImportConfig = async () => {
    try {
        await ElMessageBox.confirm('确认恢复全部导入模块的默认模板吗？', '一键恢复默认', {
            type: 'warning',
            confirmButtonText: '恢复全部',
            cancelButtonText: '取消'
        })
    } catch (error) {
        return
    }
    const articleDefault = getDefaultImportModuleConfig('article')
    importConfigForm.articleBatchImport.model = String(articleDefault.model || '').trim()
    importConfigForm.articleBatchImport.promptTemplate = String(articleDefault.promptTemplate || '').trim()
    const websiteDefault = getDefaultImportModuleConfig('website')
    importConfigForm.websiteBatchImport.model = String(websiteDefault.model || '').trim()
    importConfigForm.websiteBatchImport.promptTemplate = String(websiteDefault.promptTemplate || '').trim()
    selectedArticlePresetId.value = ''
    selectedWebsitePresetId.value = ''
    ElMessage.success('全部模块已恢复默认模板')
}

/**
 * 复制指定模块提示词到剪贴板，便于快速二次编辑。
 */
const handleCopyImportPrompt = async (module: ImportModuleType) => {
    const promptTemplate = String(getImportModuleConfig(module).promptTemplate || '').trim()
    if (!promptTemplate) {
        ElMessage.warning('当前提示词为空，无法复制')
        return
    }
    try {
        if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(promptTemplate)
        } else {
            const textarea = document.createElement('textarea')
            textarea.value = promptTemplate
            textarea.style.position = 'fixed'
            textarea.style.opacity = '0'
            document.body.appendChild(textarea)
            textarea.select()
            document.execCommand('copy')
            document.body.removeChild(textarea)
        }
        ElMessage.success('提示词已复制')
    } catch (error) {
        ElMessage.error('复制失败，请手动复制')
    }
}

/**
 * 将接口返回值写入导入配置表单，避免 reactive 对象整体替换失效。
 */
const applyImportConfig = (payload: any) => {
    const defaults = createDefaultImportConfig()
    const articleConfig = normalizeImportModuleConfig(payload?.articleBatchImport, defaults.articleBatchImport)
    const websiteConfig = normalizeImportModuleConfig(payload?.websiteBatchImport, defaults.websiteBatchImport)
    const networkConfig = normalizeImportNetworkConfig(
        payload?.network || payload?.remoteImageTransfer,
        defaults.network
    )

    importConfigForm.articleBatchImport.enabled = articleConfig.enabled
    importConfigForm.articleBatchImport.model = articleConfig.model
    importConfigForm.articleBatchImport.promptTemplate =
        articleConfig.promptTemplate || defaults.articleBatchImport.promptTemplate

    importConfigForm.websiteBatchImport.enabled = websiteConfig.enabled
    importConfigForm.websiteBatchImport.model = websiteConfig.model
    importConfigForm.websiteBatchImport.promptTemplate =
        websiteConfig.promptTemplate || defaults.websiteBatchImport.promptTemplate

    importConfigForm.network.allowInsecureTls = networkConfig.allowInsecureTls
    importConfigForm.network.insecureDomains = [...networkConfig.insecureDomains]
}

/**
 * 加载“批量导入 AI 配置”。
 */
const loadImportConfig = async () => {
    importConfigLoading.value = true
    try {
        if (!Array.isArray(configList.value) || configList.value.length === 0) {
            await loadConfigList()
        }
        const [configRes, presetRes] = await Promise.all([
            uiedAiImportConfigGet(),
            uiedAiImportTemplatePresetsGet()
        ])
        applyImportConfig(configRes?.data || configRes || {})
        applyImportTemplatePresets(presetRes?.data || presetRes || {})
        syncLastSavedImportConfig()
    } catch (error) {
        console.error('获取导入配置失败:', error)
        applyImportConfig({})
        applyImportTemplatePresets({})
        syncLastSavedImportConfig()
        ElMessage.error('获取导入配置失败，已回退默认值')
    } finally {
        importConfigLoading.value = false
    }
}

/**
 * 保存“批量导入 AI 配置”。
 */
const handleSaveImportConfig = async () => {
    importConfigSaveLoading.value = true
    try {
        const payload = buildImportConfigPayload()
        await uiedAiImportConfigSave(payload)
        syncLastSavedImportConfig()
        ElMessage.success('导入配置已保存')
    } catch (error: any) {
        console.error('保存导入配置失败:', error)
        ElMessage.error(error?.msg || error?.message || '保存失败')
    } finally {
        importConfigSaveLoading.value = false
    }
}

// ==================== 功能开关 ====================

/** 功能开关表单 */
const toggleForm = reactive({
    aiEnabled: true,
    aiSearch: true,
    aiGenerate: true,
    aiChat: false
})

const toggleLoading = ref(false)
const toggleSaveLoading = ref(false)

/** 加载功能开关配置 */
const loadFeatureToggle = async () => {
    toggleLoading.value = true
    try {
        const res = await uiedAiFeatureToggle()
        const data = res?.data || res || {}
        toggleForm.aiEnabled = data.aiEnabled ?? true
        toggleForm.aiSearch = data.aiSearch ?? true
        toggleForm.aiGenerate = data.aiGenerate ?? true
        toggleForm.aiChat = data.aiChat ?? false
    } catch (error) {
        console.error('获取功能开关配置失败:', error)
        ElMessage.error('获取功能开关配置失败')
    } finally {
        toggleLoading.value = false
    }
}

/** 保存功能开关配置 */
const handleSaveToggle = async () => {
    toggleSaveLoading.value = true
    try {
        await uiedAiSaveFeatureToggle({
            aiEnabled: toggleForm.aiEnabled,
            aiSearch: toggleForm.aiSearch,
            aiGenerate: toggleForm.aiGenerate,
            aiChat: toggleForm.aiChat
        })
        ElMessage.success('功能开关配置已保存')
    } catch (error: any) {
        console.error('保存功能开关配置失败:', error)
        ElMessage.error(error?.msg || error?.message || '保存失败')
    } finally {
        toggleSaveLoading.value = false
    }
}

// ==================== Tab 切换监听 ====================

/** 切换 Tab 时加载对应数据 */
watch(activeTab, (newTab) => {
    if (newTab === 'import') {
        loadImportConfig()
    } else if (newTab === 'stats') {
        loadStats()
        loadLogList()
    } else if (newTab === 'toggle') {
        loadFeatureToggle()
    }
})

/**
 * 提供商切换时自动补齐地址与模型
 */
watch(
    () => editForm.provider,
    (provider) => {
        const providerKey = normalizeProviderKey(String(provider || ''))
        applyProviderDefaults(providerKey, false)
        const presetOptions = getProviderModelPresets(providerKey)
        if (
            editForm.modelPreset &&
            !presetOptions.some((item) => item.value === editForm.modelPreset)
        ) {
            editForm.modelPreset = ''
        }
        const mergedModels = getProviderMergedModelOptions(providerKey, editForm.model)
        if (!String(editForm.model || '').trim() && mergedModels.length > 0) {
            editForm.model = mergedModels[0].value
        }
        if (
            showEditDialog.value &&
            String(editForm.apiKey || '').trim() &&
            (!Array.isArray(providerRemoteModelMap[providerKey]) ||
                providerRemoteModelMap[providerKey].length === 0)
        ) {
            handleFetchProviderModels({ silent: true })
        }
    }
)

// ==================== 生命周期 ====================

onMounted(() => {
    loadConfigList()
})
</script>

<style scoped>
.w-100 {
    width: 100%;
}

.option-url-hint {
    color: #999;
    font-size: 12px;
    margin-left: 8px;
}

.min-h-300 {
    min-height: 300px;
}

.input-w-160 {
    width: 160px;
}

.input-w-280 {
    width: 280px;
}

.max-w-600 {
    max-width: 600px;
}

.import-config-panel {
    max-width: 880px;
}

.import-config-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
}

.import-config-toolbar__actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.import-module-card {
    border: 1px solid var(--el-border-color-light);
}

.import-network-card {
    border: 1px solid var(--el-border-color-light);
}

.import-module-card__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
}

.import-module-card__title {
    font-size: 15px;
    font-weight: 600;
    color: #303133;
    line-height: 1.2;
}

.import-module-card__desc {
    margin-top: 4px;
    font-size: 12px;
    color: #909399;
}

.import-module-card__preset {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 14px;
}

.import-module-card__preset-select {
    min-width: 260px;
    flex: 1;
}

.import-config-changed {
    margin-top: 14px;
}

.import-preset-manage {
    margin-top: 14px;
    border: 1px solid var(--el-border-color-light);
    border-radius: 8px;
    padding: 12px;
    background: #fafafa;
}

.import-preset-manage__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
}

.import-preset-manage__title {
    font-size: 13px;
    font-weight: 600;
    color: #303133;
}

.import-preset-manage__actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.divider-my-12 {
    margin: 12px 0;
}

.ml-8 {
    margin-left: 8px;
}

.stats-card {
    text-align: center;
    margin-bottom: 8px;
}
.stats-card .el-card__body {
    padding: 16px;
}
.stats-card-title {
    font-size: 13px;
    color: #909399;
    margin-bottom: 8px;
}
.stats-card-value {
    font-size: 28px;
    font-weight: 600;
    color: #303133;
}
.stats-card-value--danger {
    color: #f56c6c;
}
.stats-summary-line {
    display: flex;
    align-items: center;
    gap: 16px;
    flex-wrap: wrap;
    font-size: 13px;
    color: #606266;
    margin: -4px 0 14px;
}
.stats-feature-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}
.stats-feature-title {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
}
.stats-feature-subtitle {
    font-size: 12px;
    color: #909399;
}

/* 功能开关样式 */
.toggle-form {
    padding: 16px 0;
}
.toggle-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
}
.toggle-item-info {
    flex: 1;
    margin-right: 16px;
}
.toggle-item-title {
    font-size: 14px;
    font-weight: 500;
    color: #303133;
}
.toggle-item-desc {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
}
.ai-model-field {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
}
.ai-model-field__select {
    flex: 1;
    min-width: 0;
}
.ai-model-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}
.ai-model-option__label {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 420px;
}
.ai-form-chip-wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    width: 100%;
}
.ai-reasoning-alert {
    width: 100%;
}
.ai-reasoning-alert__content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
}
</style>
