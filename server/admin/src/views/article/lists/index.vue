<!--
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-02-16
 */
-->
<template>
    <div class="article-lists">
        <el-card class="!border-none" shadow="never">
            <el-form ref="formRef" class="mb-[-16px]" :model="queryParams" :inline="true">
                <el-form-item label="文章标题">
                    <el-input
                        class="w-[280px]"
                        v-model="queryParams.title"
                        placeholder="输入标题关键词"
                        clearable
                        @keyup.enter="resetPage"
                        @clear="resetPage"
                    />
                </el-form-item>
                <el-form-item label="栏目名称">
                    <el-select
                        class="w-[280px]"
                        v-model="queryParams.cid"
                        clearable
                        filterable
                        @change="handleSearchFieldChange"
                    >
                        <el-option label="全部" value />
                        <el-option
                            v-for="item in optionsData.articleCate"
                            :key="item.id"
                            :label="item.name"
                            :value="item.id"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item label="发布状态">
                    <el-select
                        class="w-[220px]"
                        v-model="queryParams.isShow"
                        clearable
                        @change="handleSearchFieldChange"
                    >
                        <el-option label="全部" value />
                        <el-option label="已发布" :value="1" />
                        <el-option label="待发布" :value="0" />
                    </el-select>
                </el-form-item>
                <el-form-item label="审核状态">
                    <el-select
                        class="w-[220px]"
                        v-model="queryParams.reviewStatus"
                        clearable
                        @change="handleSearchFieldChange"
                    >
                        <el-option label="全部" value />
                        <el-option label="待审核" :value="1" />
                        <el-option label="已通过" :value="2" />
                        <el-option label="已驳回" :value="3" />
                        <el-option label="需修改" :value="4" />
                    </el-select>
                </el-form-item>
                <el-form-item label="文章标签">
                    <el-select
                        class="w-[280px]"
                        v-model="queryParams.tagId"
                        clearable
                        filterable
                        @change="handleSearchFieldChange"
                    >
                        <el-option label="全部" value />
                        <el-option
                            v-for="item in optionsData.articleTag"
                            :key="item.id"
                            :label="item.name"
                            :value="item.id"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item label="所属专题">
                    <el-select
                        class="w-[280px]"
                        v-model="queryParams.topicId"
                        clearable
                        filterable
                        @change="handleSearchFieldChange"
                    >
                        <el-option label="全部" value />
                        <el-option
                            v-for="item in optionsData.articleTopic"
                            :key="item.id"
                            :label="item.name"
                            :value="item.id"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="resetPage">查询</el-button>
                    <el-button @click="resetParams">重置</el-button>
                </el-form-item>
            </el-form>
        </el-card>
        <el-card class="!border-none mt-4" shadow="never">
            <div>
                <template v-if="!isRecycleBinMode">
                    <el-button
                        v-perms="['article:add', 'article:add/edit']"
                        type="primary"
                        class="mb-4"
                        @click="handleCreate"
                    >
                        <template #icon>
                            <icon name="el-icon-Plus" />
                        </template>
                        发布文章
                    </el-button>
                    <el-button
                        v-perms="['article:add', 'article:add/edit']"
                        class="mb-4 ml-2"
                        :disabled="batchWechatImportLoading"
                        @click="openBatchWechatImportDialog"
                    >
                        批量导入文章
                    </el-button>
                    <el-button
                        v-perms="['article:edit', 'article:add/edit']"
                        class="mb-4 ml-2"
                        :disabled="selectedIds.length === 0"
                        @click="openBatchEditDialog"
                    >
                        批量编辑
                    </el-button>
                    <el-button
                        v-perms="['article:edit']"
                        class="mb-4 ml-2"
                        @click="openRecyclePolicyDialog"
                    >
                        回收策略
                    </el-button>
                </template>
            </div>
            <div class="article-summary mb-3">
                <el-tag effect="plain">当前列表 {{ safeLists.length }} 条</el-tag>
                <template v-if="!isRecycleBinMode">
                    <el-tag type="warning" effect="plain">待审核 {{ pageAuditPendingCount }} 条</el-tag>
                    <el-tag type="success" effect="plain">已发布 {{ pagePublishedCount }} 条</el-tag>
                    <el-tag type="info" effect="plain">待发布 {{ pageDraftCount }} 条</el-tag>
                </template>
                <template v-else>
                    <el-tag type="warning" effect="plain">回收站 {{ safeLists.length }} 条</el-tag>
                </template>
            </div>
            <div class="article-quick-filters mb-3">
                <span class="article-quick-filters__label">快捷筛选</span>
                <el-button
                    size="small"
                    :type="isQuickFilterActive('all') ? 'primary' : undefined"
                    @click="applyQuickFilter('all')"
                >
                    全部
                </el-button>
                <el-button
                    size="small"
                    :type="isQuickFilterActive('pendingReview') ? 'warning' : undefined"
                    :plain="!isQuickFilterActive('pendingReview')"
                    @click="applyQuickFilter('pendingReview')"
                >
                    待审核
                </el-button>
                <el-button
                    size="small"
                    :type="isQuickFilterActive('published') ? 'success' : undefined"
                    :plain="!isQuickFilterActive('published')"
                    @click="applyQuickFilter('published')"
                >
                    已发布
                </el-button>
                <el-button
                    size="small"
                    :type="isQuickFilterActive('draft') ? 'info' : undefined"
                    :plain="!isQuickFilterActive('draft')"
                    @click="applyQuickFilter('draft')"
                >
                    待发布
                </el-button>
                <el-button
                    size="small"
                    :type="isQuickFilterActive('recycle') ? 'warning' : undefined"
                    :plain="!isQuickFilterActive('recycle')"
                    @click="applyQuickFilter('recycle')"
                >
                    回收站
                </el-button>
            </div>

            <el-dialog
                v-model="batchWechatImportDialogVisible"
                :title="batchArticleImportDialogTitle"
                width="860px"
                :close-on-click-modal="!batchWechatImportLoading"
                destroy-on-close
            >
                <div
                    v-loading="batchWechatImportLoading"
                    :element-loading-text="batchArticleImportLoadingText"
                >
                    <el-form :model="batchWechatImportForm" label-width="120px">
                        <el-form-item label="处理方式" required>
                            <el-select
                                v-model="batchWechatImportForm.mode"
                                style="width: 100%"
                                :disabled="batchWechatImportLoading"
                            >
                                <el-option label="公众号链接导入" value="wechatImport" />
                                <el-option label="批量AI生成文章" value="aiGenerate" />
                            </el-select>
                        </el-form-item>
                        <el-form-item label="文章栏目" required>
                            <el-select
                                v-model="batchWechatImportForm.cid"
                                placeholder="请选择栏目"
                                filterable
                                clearable
                                style="width: 100%"
                                :disabled="batchWechatImportLoading"
                            >
                                <el-option
                                    v-for="item in optionsData.articleCate"
                                    :key="item.id"
                                    :label="item.name"
                                    :value="item.id"
                                />
                            </el-select>
                        </el-form-item>
                        <el-form-item label="作者" required>
                            <el-select
                                v-model="batchWechatImportForm.author"
                                placeholder="请选择作者（支持输入搜索）"
                                filterable
                                remote
                                clearable
                                :remote-method="fetchBatchImportAuthorOptions"
                                @visible-change="handleBatchImportAuthorVisibleChange"
                                :loading="batchWechatImportAuthorLoading"
                                style="width: 100%"
                                :disabled="batchWechatImportLoading"
                            >
                                <el-option
                                    v-for="item in batchWechatImportAuthorOptions"
                                    :key="item.value"
                                    :label="item.label"
                                    :value="item.value"
                                >
                                    <div class="flex items-center justify-between gap-2">
                                        <span>{{ item.label }}</span>
                                        <span class="text-xs text-gray-400">{{ item.userTypeName }}</span>
                                    </div>
                                </el-option>
                            </el-select>
                        </el-form-item>
                        <el-form-item :label="batchArticleImportTextareaLabel" required>
                            <el-input
                                v-model="batchArticleImportTextareaValue"
                                type="textarea"
                                :rows="8"
                                :placeholder="batchArticleImportTextareaPlaceholder"
                                :disabled="batchWechatImportLoading"
                            />
                        </el-form-item>
                        <el-form-item label="发布状态">
                            <el-radio-group
                                v-model="batchWechatImportForm.status"
                                :disabled="batchWechatImportLoading"
                            >
                                <el-radio-button label="draft">草稿</el-radio-button>
                                <el-radio-button label="published">发布</el-radio-button>
                            </el-radio-group>
                        </el-form-item>
                        <el-form-item
                            v-if="batchWechatImportForm.mode === 'wechatImport'"
                            label="导入选项"
                        >
                            <el-checkbox
                                v-model="batchWechatImportForm.aiEnabled"
                                :disabled="batchWechatImportLoading"
                            >
                                导入后使用 AI 润色正文
                            </el-checkbox>
                            <div
                                v-if="batchWechatImportForm.aiEnabled"
                                class="text-xs text-gray-500 mt-2"
                            >
                                模型与提示词请在「AI 助手管理 -> 导入配置」中统一设置。
                            </div>
                        </el-form-item>
                        <el-form-item
                            v-else
                            label="生成说明"
                        >
                            <div class="w-full">
                                <div class="text-xs text-gray-500 leading-6">
                                    每行输入一个文章选题、标题方向或关键词，系统会逐篇调用默认 AI 模型生成完整文章并直接入库。
                                </div>
                                <el-collapse
                                    v-model="batchAiGenerateAdvancedPanels"
                                    class="mt-3"
                                >
                                    <el-collapse-item
                                        title="高级AI配置（可选）"
                                        name="advanced"
                                    >
                                        <div class="text-xs text-gray-500 leading-6 mb-3">
                                            留空时将自动使用「AI 助手管理 -> 导入配置」中“批量导入文章”的默认模型与提示词。
                                        </div>
                                        <el-form-item
                                            label="提示词预设"
                                            label-width="88px"
                                            class="mb-3"
                                        >
                                            <div class="flex w-full gap-2">
                                                <el-select
                                                    v-model="selectedBatchAiArticlePresetId"
                                                    class="flex-1"
                                                    placeholder="选择文章生成预设模板"
                                                    clearable
                                                    filterable
                                                    :loading="batchAiArticlePresetLoading"
                                                    :disabled="batchWechatImportLoading"
                                                >
                                                    <el-option
                                                        v-for="item in batchAiArticlePresetOptions"
                                                        :key="item.id"
                                                        :label="item.description ? `${item.name} · ${item.description}` : item.name"
                                                        :value="item.id"
                                                    />
                                                </el-select>
                                                <el-button
                                                    :disabled="!selectedBatchAiArticlePresetId || batchWechatImportLoading"
                                                    @click="handleApplyBatchAiArticlePreset"
                                                >
                                                    应用预设
                                                </el-button>
                                            </div>
                                        </el-form-item>
                                        <el-form-item
                                            label="模型覆盖"
                                            label-width="88px"
                                            class="mb-3"
                                        >
                                            <el-input
                                                v-model="batchWechatImportForm.aiModel"
                                                placeholder="可选，例如：deepseek-chat / kimi-k2 / doubao-seed"
                                                :disabled="batchWechatImportLoading"
                                                clearable
                                            />
                                        </el-form-item>
                                        <el-form-item
                                            label="提示词模板"
                                            label-width="88px"
                                            class="mb-0"
                                        >
                                            <el-input
                                                v-model="batchWechatImportForm.aiPromptTemplate"
                                                type="textarea"
                                                :rows="6"
                                                :disabled="batchWechatImportLoading"
                                                placeholder="可选，支持占位符 {topic}。留空时使用系统默认提示词模板。"
                                            />
                                            <div class="text-xs text-gray-500 mt-2 leading-6">
                                                适合在专题运营时临时覆盖默认提示词，例如指定文章语气、受众人群、段落结构或 SEO 输出要求。
                                            </div>
                                        </el-form-item>
                                    </el-collapse-item>
                                </el-collapse>
                            </div>
                        </el-form-item>
                    </el-form>

                    <el-alert
                        v-if="batchWechatImportResult"
                        class="mt-2"
                        type="info"
                        :closable="false"
                        :title="`${batchArticleImportResultLabel}：新增 ${batchWechatImportResult.created} 条，失败 ${batchWechatImportResult.failed} 条`"
                    />
                    <el-table
                        v-if="batchWechatImportResult && batchWechatImportResult.rows.length > 0"
                        :data="batchWechatImportResult.rows"
                        size="small"
                        max-height="300"
                        class="mt-3"
                    >
                        <el-table-column type="index" label="#" width="56" />
                        <el-table-column label="状态" width="88">
                            <template #default="{ row }">
                                <el-tag :type="row.status === 'created' ? 'success' : 'danger'" size="small">
                                    {{ row.status === 'created' ? '成功' : '失败' }}
                                </el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column :label="batchArticleImportSourceLabel" min-width="260" show-overflow-tooltip>
                            <template #default="{ row }">{{ row.url || '-' }}</template>
                        </el-table-column>
                        <el-table-column label="文章ID" width="96">
                            <template #default="{ row }">{{ row.articleId || '-' }}</template>
                        </el-table-column>
                        <el-table-column label="标题" min-width="180" show-overflow-tooltip>
                            <template #default="{ row }">{{ row.title || '-' }}</template>
                        </el-table-column>
                        <el-table-column
                            v-if="batchWechatImportForm.mode === 'aiGenerate'"
                            label="模板/模型"
                            min-width="220"
                            show-overflow-tooltip
                        >
                            <template #default="{ row }">{{ formatBatchAiMetaText(row) }}</template>
                        </el-table-column>
                        <el-table-column label="说明" min-width="240" show-overflow-tooltip>
                            <template #default="{ row }">{{ row.reason || '-' }}</template>
                        </el-table-column>
                    </el-table>
                </div>
                <template #footer>
                    <el-button :disabled="batchWechatImportLoading" @click="batchWechatImportDialogVisible = false">
                        取消
                    </el-button>
                    <el-button
                        type="primary"
                        :loading="batchWechatImportLoading"
                        :disabled="batchWechatImportLoading"
                        @click="handleBatchWechatImportSubmit"
                    >
                        {{ batchArticleImportActionText }}
                    </el-button>
                </template>
            </el-dialog>

            <el-dialog
                v-model="batchEditDialogVisible"
                title="批量编辑文章"
                width="700px"
                destroy-on-close
            >
                <el-alert
                    class="mb-3"
                    type="info"
                    :closable="false"
                    :title="`当前已选择 ${selectedIds.length} 篇文章`"
                />
                <el-form :model="batchEditForm" label-width="120px">
                    <el-form-item label="栏目设置">
                        <el-switch v-model="batchEditForm.applyCid" />
                        <el-select
                            v-model="batchEditForm.cid"
                            class="ml-3 w-[320px]"
                            clearable
                            filterable
                            placeholder="选择栏目"
                            :disabled="!batchEditForm.applyCid"
                        >
                            <el-option
                                v-for="item in optionsData.articleCate"
                                :key="item.id"
                                :label="item.name"
                                :value="item.id"
                            />
                        </el-select>
                    </el-form-item>
                    <el-form-item label="标签设置">
                        <el-switch v-model="batchEditForm.applyTagIds" />
                        <el-select
                            v-model="batchEditForm.tagIds"
                            class="ml-3 w-[320px]"
                            multiple
                            clearable
                            filterable
                            collapse-tags
                            collapse-tags-tooltip
                            placeholder="选择标签"
                            :disabled="!batchEditForm.applyTagIds"
                        >
                            <el-option
                                v-for="item in optionsData.articleTag"
                                :key="item.id"
                                :label="item.name"
                                :value="item.id"
                            />
                        </el-select>
                    </el-form-item>
                    <el-form-item label="专题设置">
                        <el-switch v-model="batchEditForm.applyTopicId" />
                        <el-select
                            v-model="batchEditForm.topicId"
                            class="ml-3 w-[320px]"
                            clearable
                            filterable
                            placeholder="选择专题"
                            :disabled="!batchEditForm.applyTopicId"
                        >
                            <el-option label="不设置专题" :value="0" />
                            <el-option
                                v-for="item in optionsData.articleTopic"
                                :key="item.id"
                                :label="item.name"
                                :value="item.id"
                            />
                        </el-select>
                    </el-form-item>
                    <el-form-item label="发布状态">
                        <el-switch v-model="batchEditForm.applyIsShow" />
                        <el-radio-group v-model="batchEditForm.isShow" class="ml-3" :disabled="!batchEditForm.applyIsShow">
                            <el-radio :label="1">已发布</el-radio>
                            <el-radio :label="0">待发布</el-radio>
                        </el-radio-group>
                    </el-form-item>
                    <el-form-item label="SEO设置">
                        <el-switch v-model="batchEditForm.applySeo" />
                    </el-form-item>
                    <template v-if="batchEditForm.applySeo">
                        <el-form-item label="SEO标题模板">
                            <el-input
                                v-model="batchEditForm.seoTitleTemplate"
                                placeholder="例如：{title} - {category}"
                            />
                        </el-form-item>
                        <el-form-item label="SEO描述模板">
                            <el-input
                                v-model="batchEditForm.seoDescriptionTemplate"
                                type="textarea"
                                :rows="3"
                                placeholder="例如：{summary}，作者：{author}"
                            />
                            <div class="form-tips">支持变量：{title} {intro} {summary} {category} {author}</div>
                        </el-form-item>
                    </template>
                </el-form>
                <template #footer>
                    <el-button :disabled="batchEditLoading" @click="batchEditDialogVisible = false">取消</el-button>
                    <el-button type="primary" :loading="batchEditLoading" @click="handleBatchEditSubmit">确认批量编辑</el-button>
                </template>
            </el-dialog>

            <el-dialog
                v-model="recyclePolicyDialogVisible"
                title="回收站自动清理策略"
                width="620px"
                destroy-on-close
            >
                <el-form :model="recyclePolicyForm" label-width="140px">
                    <el-form-item label="启用自动清理">
                        <el-switch v-model="recyclePolicyForm.enabled" />
                    </el-form-item>
                    <el-form-item label="保留天数">
                        <el-input-number
                            v-model="recyclePolicyForm.retentionDays"
                            :min="1"
                            :max="365"
                            :step="1"
                        />
                    </el-form-item>
                    <el-form-item label="执行间隔(小时)">
                        <el-input-number
                            v-model="recyclePolicyForm.intervalHours"
                            :min="1"
                            :max="168"
                            :step="1"
                        />
                    </el-form-item>
                    <el-form-item label="上次清理时间">
                        <span>{{ recyclePolicyLastCleanupText }}</span>
                    </el-form-item>
                </el-form>
                <template #footer>
                    <el-button :disabled="recyclePolicyLoading" @click="recyclePolicyDialogVisible = false">取消</el-button>
                    <el-button
                        type="warning"
                        plain
                        :loading="recyclePolicyCleanupLoading"
                        :disabled="recyclePolicyLoading"
                        @click="handleRecyclePolicyCleanupNow"
                    >
                        立即清理
                    </el-button>
                    <el-button type="primary" :loading="recyclePolicyLoading" @click="handleRecyclePolicySave">保存策略</el-button>
                </template>
            </el-dialog>

            <el-table
                size="large"
                stripe
                v-loading="pager.loading"
                :data="safeLists"
                @selection-change="handleSelectionChange"
            >
                <el-table-column type="selection" width="50" />
                <el-table-column label="ID" prop="id" min-width="80" />
                <el-table-column label="封面" min-width="100">
                    <template #default="{ row }">
                        <image-contain
                            v-if="row.image"
                            :src="row.image"
                            :width="60"
                            :height="45"
                            :preview-src-list="[row.image]"
                            preview-teleported
                            fit="contain"
                        />
                    </template>
                </el-table-column>
                <el-table-column
                    label="标题"
                    prop="title"
                    min-width="160"
                    show-tooltip-when-overflow
                />
                <el-table-column label="栏目" prop="category" min-width="100" />
                <el-table-column label="标签" min-width="160">
                    <template #default="{ row }">
                        <el-space wrap>
                            <el-tag
                                v-for="tag in row.tags || []"
                                :key="tag"
                                size="small"
                                effect="plain"
                            >
                                {{ tag }}
                            </el-tag>
                            <span v-if="!row.tags || row.tags.length === 0" class="text-info"
                                >-</span
                            >
                        </el-space>
                    </template>
                </el-table-column>
                <el-table-column label="专题" prop="topic" min-width="120" />
                <el-table-column label="作者" prop="author" min-width="120" />
                <el-table-column label="浏览量" prop="visit" min-width="100" />
                <el-table-column label="收藏数" prop="collectCount" min-width="100" />
                <el-table-column label="点赞数" prop="likeCount" min-width="100" />
                <el-table-column label="发布状态" min-width="120">
                    <template #default="{ row }">
                        <el-tag v-if="Number(row.isShow) === 1" type="success">已发布</el-tag>
                        <el-tag v-else type="info">待发布</el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="审核状态" min-width="120">
                    <template #default="{ row }">
                        <el-tag :type="getReviewTagType(row.reviewStatus)">
                            {{ row.reviewStatusName || '-' }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="审核备注" min-width="180" show-overflow-tooltip>
                    <template #default="{ row }">
                        <span>{{ row.reviewRemark || '-' }}</span>
                    </template>
                </el-table-column>
                <el-table-column label="排序" prop="sort" min-width="100" />
                <el-table-column label="发布时间" prop="createTime" min-width="120" />
                <el-table-column label="操作" width="180" fixed="right">
                    <template #default="{ row }">
                        <div class="article-actions">
                            <el-tooltip
                                content="审核通过并发布"
                                placement="top"
                                v-if="!isRecycleBinMode && Number(row.reviewStatus) === 1 && Number(row.isShow) !== 1"
                            >
                                <el-button
                                    v-perms="['article:change']"
                                    type="success"
                                    link
                                    :icon="Select"
                                    @click="handleAuditPass(row)"
                                />
                            </el-tooltip>

                            <el-tooltip
                                v-if="!isRecycleBinMode"
                                :content="
                                    Number(row.isShow) === 1
                                        ? '前台查看'
                                        : '待发布文章暂不可在前台查看'
                                "
                                placement="top"
                            >
                                <el-button
                                    type="primary"
                                    link
                                    :icon="View"
                                    :disabled="Number(row.isShow) !== 1"
                                    @click="handleView(row)"
                                />
                            </el-tooltip>

                            <el-tooltip v-if="!isRecycleBinMode" content="编辑" placement="top">
                                <el-button
                                    v-perms="['article:edit', 'article:add/edit']"
                                    type="primary"
                                    link
                                    :icon="EditPen"
                                    @click="handleEdit(row)"
                                />
                            </el-tooltip>

                            <el-tooltip
                                v-if="!isRecycleBinMode"
                                :content="Number(row.isShow) === 1 ? '转为待发布' : '发表'"
                                placement="top"
                            >
                                <el-button
                                    v-perms="['article:change']"
                                    type="primary"
                                    link
                                    :icon="Number(row.isShow) === 1 ? Document : Promotion"
                                    @click="togglePublish(row)"
                                />
                            </el-tooltip>

                            <el-tooltip v-if="!isRecycleBinMode" content="移入回收站" placement="top">
                                <el-button
                                    v-perms="['article:del']"
                                    type="danger"
                                    link
                                    :icon="Delete"
                                    @click="handleDelete(row.id)"
                                />
                            </el-tooltip>
                            <el-tooltip v-if="isRecycleBinMode" content="恢复文章" placement="top">
                                <el-button
                                    v-perms="['article:del']"
                                    type="success"
                                    link
                                    :icon="RefreshLeft"
                                    @click="handleRestore(row.id)"
                                />
                            </el-tooltip>
                            <el-tooltip v-if="isRecycleBinMode" content="彻底删除" placement="top">
                                <el-button
                                    v-perms="['article:del']"
                                    type="danger"
                                    link
                                    :icon="Delete"
                                    @click="handlePurge(row.id)"
                                />
                            </el-tooltip>
                        </div>
                    </template>
                </el-table-column>
            </el-table>
            <div class="flex justify-end mt-4">
                <pagination v-model="pager" @change="getLists" />
            </div>
        </el-card>
    </div>
</template>
<script lang="ts" setup name="articleLists">
import { Delete, Document, EditPen, Promotion, RefreshLeft, Select, View } from '@element-plus/icons-vue'
import {
    articleLists,
    articleDelete,
    articleRestore,
    articlePurge,
    articleBatchEdit,
    articleRecyclePolicyConfig,
    articleRecyclePolicySave,
    articleRecyclePolicyCleanup,
    articleStatus,
    articleFrontAudit,
    articleImportWechatBatch,
    articleGenerateAiBatch,
    articleCateAll,
    articleTagAll,
    articleTopicAll
} from '@/api/article'
import { uiedAiImportTemplatePresetsGet } from '@/api/uied'
import { getAuthorUserOptions } from '@/api/consumer'
import { useDictOptions } from '@/hooks/useDictOptions'
import { usePaging } from '@/hooks/usePaging'
import { getRoutePath } from '@/router'
import feedback from '@/utils/feedback'

interface ArticleOptionItem {
    id: number
    name: string
}

interface ArticleListItem {
    id: number
    image?: string
    title?: string
    slug?: string
    category?: string
    author?: string
    visit?: number
    collectCount?: number
    likeCount?: number
    sort?: number
    createTime?: string
    isShow?: number | string
    reviewStatus?: number | string
    reviewStatusName?: string
    reviewRemark?: string
    tags?: string[]
    topic?: string
}

interface AuthorOptionItem {
    value: string
    label: string
    userTypeName: string
}

interface BatchWechatImportResultRow {
    status: string
    url: string
    articleId?: number
    title?: string
    reason?: string
    templateName?: string
    modelName?: string
}

interface ImportTemplatePresetItem {
    id: string
    name: string
    description: string
    model: string
    promptTemplate: string
    enabled: boolean
    sort: number
}

type BatchEditStatusValue = 0 | 1

const queryParams = reactive({
    title: '',
    cid: '',
    isShow: '',
    reviewStatus: '',
    tagId: '',
    topicId: '',
    recycleBin: 0
})
const router = useRouter()
const selectedIds = ref<number[]>([])
const batchWechatImportDialogVisible = ref(false)
const batchWechatImportLoading = ref(false)
const batchWechatImportAuthorKeyword = ref('')
const batchWechatImportAuthorLoading = ref(false)
const batchWechatImportAuthorOptions = ref<AuthorOptionItem[]>([])
const batchAiArticlePresetLoading = ref(false)
const batchAiArticlePresetLoaded = ref(false)
const batchAiArticlePresetOptions = ref<ImportTemplatePresetItem[]>([])
const selectedBatchAiArticlePresetId = ref('')
const batchWechatImportResult = ref<{
    created: number
    failed: number
    rows: BatchWechatImportResultRow[]
} | null>(null)
const batchWechatImportForm = reactive({
    mode: 'wechatImport' as 'wechatImport' | 'aiGenerate',
    cid: '' as number | string,
    author: '',
    urlsText: '',
    topicsText: '',
    aiModel: '',
    aiPromptTemplate: '',
    status: 'draft',
    aiEnabled: false
})
const batchAiGenerateAdvancedPanels = ref<string[]>([])

/**
 * 批量处理弹窗标题
 */
const batchArticleImportDialogTitle = computed(() =>
    batchWechatImportForm.mode === 'aiGenerate' ? '批量AI生成文章' : '批量导入公众号文章'
)

/**
 * 批量处理主输入框标签
 */
const batchArticleImportTextareaLabel = computed(() =>
    batchWechatImportForm.mode === 'aiGenerate' ? '文章选题' : '公众号链接'
)

/**
 * 批量处理主输入框占位文案
 */
const batchArticleImportTextareaPlaceholder = computed(() =>
    batchWechatImportForm.mode === 'aiGenerate'
        ? '每行一个文章选题、标题方向或关键词，例如：\\nAI设计工具推荐\\nFigma插件清单\\n设计师如何用DeepSeek提效'
        : '每行一个公众号链接（https://mp.weixin.qq.com/...)'
)

/**
 * 批量处理主输入框值（根据模式切换到不同字段）
 */
const batchArticleImportTextareaValue = computed({
    get: () => (batchWechatImportForm.mode === 'aiGenerate'
        ? batchWechatImportForm.topicsText
        : batchWechatImportForm.urlsText),
    set: (value: string) => {
        if (batchWechatImportForm.mode === 'aiGenerate') {
            batchWechatImportForm.topicsText = value
            return
        }
        batchWechatImportForm.urlsText = value
    }
})

/**
 * 批量处理结果总览文案
 */
const batchArticleImportResultLabel = computed(() =>
    batchWechatImportForm.mode === 'aiGenerate' ? '生成结果' : '导入结果'
)

/**
 * 批量处理明细首列标题
 */
const batchArticleImportSourceLabel = computed(() =>
    batchWechatImportForm.mode === 'aiGenerate' ? '选题' : '链接'
)

/**
 * 批量处理确认按钮文案
 */
const batchArticleImportActionText = computed(() =>
    batchWechatImportForm.mode === 'aiGenerate' ? '开始生成' : '开始导入'
)

/**
 * 批量处理执行中的加载文案
 */
const batchArticleImportLoadingText = computed(() =>
    batchWechatImportForm.mode === 'aiGenerate'
        ? '正在批量生成文章，请稍候...'
        : '正在批量导入文章，请稍候...'
)

/**
 * 处理模式切换时清理上一次结果，避免不同模式间残留误导。
 */
watch(
    () => batchWechatImportForm.mode,
    async () => {
        batchWechatImportResult.value = null
        if (batchWechatImportForm.mode !== 'aiGenerate') {
            batchAiGenerateAdvancedPanels.value = []
            selectedBatchAiArticlePresetId.value = ''
            return
        }
        await loadBatchAiArticlePresets()
    }
)
const batchEditDialogVisible = ref(false)
const batchEditLoading = ref(false)
const batchEditForm = reactive({
    applyCid: false,
    cid: '' as number | string,
    applyTagIds: false,
    tagIds: [] as number[],
    applyTopicId: false,
    topicId: 0 as number | string,
    applyIsShow: false,
    isShow: 1 as BatchEditStatusValue,
    applySeo: false,
    seoTitleTemplate: '',
    seoDescriptionTemplate: ''
})
const recyclePolicyDialogVisible = ref(false)
const recyclePolicyLoading = ref(false)
const recyclePolicyCleanupLoading = ref(false)
const recyclePolicyForm = reactive({
    enabled: false,
    retentionDays: 30,
    intervalHours: 12,
    lastCleanupTime: 0
})
const frontendUrl = (import.meta.env.VITE_FRONTEND_URL || 'http://localhost:3003').replace(
    /\/$/,
    ''
)
/**
 * 规范化前台路由路径，确保始终为「/xxx」格式
 */
const normalizeFrontendRoutePath = (rawPath: string, fallbackPath = '/articles') => {
    const source = String(rawPath || '').trim() || String(fallbackPath || '').trim()
    const normalized = source.replace(/^\/+|\/+$/g, '')
    return normalized ? `/${normalized}` : '/'
}
const frontendArticleDetailPath = normalizeFrontendRoutePath(
    import.meta.env.VITE_FRONTEND_ARTICLE_DETAIL_PATH || '/article',
    '/article'
)

/**
 * 统一获取前台文章详情路径，优先兼容固定链接「/article/:slug」
 */
const resolveFrontendArticleDetailPath = () => {
    if (frontendArticleDetailPath === '/articles') {
        return '/article'
    }
    return frontendArticleDetailPath
}

const { pager, getLists, resetPage, resetParams } = usePaging({
    fetchFun: articleLists,
    params: queryParams
})

/**
 * 当前是否处于“回收站”视图
 */
const isRecycleBinMode = computed(() => Number(queryParams.recycleBin || 0) === 1)

/**
 * 统一处理搜索筛选项变更，减少重复点击查询按钮
 */
const handleSearchFieldChange = () => {
    resetPage()
}

const { optionsData } = useDictOptions<{
    articleCate: ArticleOptionItem[]
    articleTag: ArticleOptionItem[]
    articleTopic: ArticleOptionItem[]
}>({
    articleCate: {
        api: articleCateAll
    },
    articleTag: {
        api: articleTagAll
    },
    articleTopic: {
        api: articleTopicAll
    }
})

/**
 * 拉取“批量导入文章”作者选项（支持关键词搜索）。
 */
const fetchBatchImportAuthorOptions = async (keyword = '') => {
    batchWechatImportAuthorKeyword.value = String(keyword || '')
    batchWechatImportAuthorLoading.value = true
    try {
        const data: any = await getAuthorUserOptions({
            keyword: batchWechatImportAuthorKeyword.value,
            pageSize: 30
        })
        batchWechatImportAuthorOptions.value = Array.isArray(data)
            ? data.map((item: any) => ({
                  value: String(item?.value || item?.id || ''),
                  label: String(item?.label || ''),
                  userTypeName: String(item?.userTypeName || '普通用户')
              }))
            : []
    } catch (error) {
        batchWechatImportAuthorOptions.value = []
    } finally {
        batchWechatImportAuthorLoading.value = false
    }
}

/**
 * 作者下拉展开时初始化数据，避免首开空列表。
 */
const handleBatchImportAuthorVisibleChange = (visible: boolean) => {
    if (!visible) return
    fetchBatchImportAuthorOptions(batchWechatImportAuthorKeyword.value)
}

/**
 * 解析文章编辑路由，优先使用动态菜单路由，缺失时使用兜底路径
 */
const resolveEditPath = () => {
    const routePaths = new Set(router.getRoutes().map((item) => item.path))
    const dynamicPath = getRoutePath('article:add/edit')
    const fallbackPaths = ['/article-manage/article/add/edit', '/_detail/article/edit']
    const candidates = [dynamicPath, ...fallbackPaths].filter(Boolean) as string[]
    const matched = candidates.find((path) => routePaths.has(path))
    return matched || fallbackPaths[0]
}

/**
 * 文章编辑路由
 */
const articleEditRoutePath = computed(() => resolveEditPath())

/**
 * 安全获取当前页列表，避免接口异常结构导致页面报错
 */
const safeLists = computed<ArticleListItem[]>(() =>
    Array.isArray(pager.lists) ? (pager.lists as ArticleListItem[]) : []
)

/**
 * 当前页待审核数量
 */
const pageAuditPendingCount = computed(
    () => safeLists.value.filter((item) => Number(item.reviewStatus) === 1).length
)

/**
 * 当前页已发布数量
 */
const pagePublishedCount = computed(
    () => safeLists.value.filter((item) => Number(item.isShow) === 1).length
)

/**
 * 当前页待发布数量
 */
const pageDraftCount = computed(
    () => safeLists.value.filter((item) => Number(item.isShow) !== 1).length
)

/**
 * 回收策略上次清理时间文案
 */
const recyclePolicyLastCleanupText = computed(() => {
    const timestamp = Number(recyclePolicyForm.lastCleanupTime || 0)
    if (!Number.isFinite(timestamp) || timestamp <= 0) return '未执行过'
    return new Date(timestamp * 1000).toLocaleString('zh-CN', { hour12: false })
})

/**
 * 审核状态标签颜色
 */
const getReviewTagType = (reviewStatus: number | string | undefined) => {
    const status = Number(reviewStatus || 0)
    if (status === 1) return 'warning'
    if (status === 2) return 'success'
    if (status === 3) return 'danger'
    return 'info'
}

/**
 * 记录表格多选项，用于批量编辑。
 */
const handleSelectionChange = (rows: ArticleListItem[]) => {
    selectedIds.value = Array.from(
        new Set(
            (Array.isArray(rows) ? rows : [])
                .map((item) => Number(item?.id || 0))
                .filter((item) => Number.isInteger(item) && item > 0)
        )
    )
}

/**
 * 跳转到文章发布页
 */
const handleCreate = async () => {
    const path = articleEditRoutePath.value
    if (!path) {
        feedback.msgError('未找到文章编辑路由，请在角色权限中授权 article:add/edit')
        return
    }
    await router.push({ path })
}

/**
 * 跳转到文章编辑页
 */
const handleEdit = async (row: ArticleListItem) => {
    const path = articleEditRoutePath.value
    if (!path) {
        feedback.msgError('未找到文章编辑路由，请在角色权限中授权 article:add/edit')
        return
    }
    await router.push({
        path,
        query: { id: row.id }
    })
}

/**
 * 切换文章发布状态
 */
const togglePublish = async (row: ArticleListItem) => {
    try {
        await articleStatus({ id: row.id })
        feedback.msgSuccess(Number(row.isShow) === 1 ? '已转为待发布' : '已发表')
        getLists()
    } catch (error) {
        getLists()
    }
}

/**
 * 审核通过并发布文章
 */
const handleAuditPass = async (row: ArticleListItem) => {
    try {
        await feedback.confirm('确认审核通过并直接发布该文章？')
    } catch (error) {
        return
    }
    await articleFrontAudit({
        id: Number(row.id),
        reviewStatus: 2
    })
    feedback.msgSuccess('审核通过并发布成功')
    getLists()
}

/**
 * 在前台新窗口查看文章
 */
const handleView = (row: ArticleListItem) => {
    const articleSlug = String(row?.slug || row?.id || '').trim()
    const articlePath = resolveFrontendArticleDetailPath()
    window.open(`${frontendUrl}${articlePath}/${encodeURIComponent(articleSlug)}`, '_blank')
}

/**
 * 删除文章
 */
const handleDelete = async (id: number) => {
    try {
        await feedback.confirm('确认将该文章移入回收站？')
    } catch (error) {
        return
    }
    await articleDelete({ id })
    feedback.msgSuccess('已移入回收站')
    getLists()
}

/**
 * 从回收站恢复文章
 */
const handleRestore = async (id: number) => {
    try {
        await feedback.confirm('确认恢复该文章到正常列表？')
    } catch (error) {
        return
    }
    await articleRestore({ id })
    feedback.msgSuccess('文章已恢复')
    getLists()
}

/**
 * 彻底删除回收站文章（不可恢复）
 */
const handlePurge = async (id: number) => {
    try {
        await feedback.confirm('确认彻底删除该文章？该操作不可恢复。')
    } catch (error) {
        return
    }
    await articlePurge({ id })
    feedback.msgSuccess('文章已彻底删除')
    getLists()
}

/**
 * 打开“批量导入公众号文章”弹窗并重置表单状态。
 */
const openBatchWechatImportDialog = () => {
    batchWechatImportDialogVisible.value = true
    batchWechatImportResult.value = null
    batchAiGenerateAdvancedPanels.value = []
    selectedBatchAiArticlePresetId.value = ''
    batchWechatImportForm.mode = 'wechatImport'
    batchWechatImportForm.cid = ''
    batchWechatImportForm.author = ''
    batchWechatImportForm.urlsText = ''
    batchWechatImportForm.topicsText = ''
    batchWechatImportForm.aiModel = ''
    batchWechatImportForm.aiPromptTemplate = ''
    batchWechatImportForm.status = 'draft'
    batchWechatImportForm.aiEnabled = false
    fetchBatchImportAuthorOptions('')
}

/**
 * 规范化“文章导入模板库”预设列表，只保留启用项并统一字段。
 */
const normalizeBatchAiArticlePresetList = (payload: any): ImportTemplatePresetItem[] => {
    const source = Array.isArray(payload?.article) ? payload.article : []
    return source
        .map((item: any, index: number) => ({
            id: String(item?.id || `article_preset_${index + 1}`).trim(),
            name: String(item?.name || `模板 ${index + 1}`).trim(),
            description: String(item?.description || '').trim(),
            model: String(item?.model || '').trim(),
            promptTemplate: String(item?.promptTemplate || '').trim(),
            enabled: item?.enabled !== false,
            sort: Number.isFinite(Number(item?.sort)) ? Number(item?.sort) : (index + 1) * 10
        }))
        .filter((item) => item.enabled !== false && item.promptTemplate)
        .sort((a, b) => Number(a.sort || 0) - Number(b.sort || 0))
}

/**
 * 加载“文章导入模板库”预设，复用 AI 助手管理中的统一模板配置。
 */
const loadBatchAiArticlePresets = async (force = false) => {
    if (batchAiArticlePresetLoading.value) return
    if (!force && batchAiArticlePresetLoaded.value) return
    batchAiArticlePresetLoading.value = true
    try {
        const res: any = await uiedAiImportTemplatePresetsGet()
        batchAiArticlePresetOptions.value = normalizeBatchAiArticlePresetList(res?.data || res || {})
        batchAiArticlePresetLoaded.value = true
    } catch (error: any) {
        batchAiArticlePresetOptions.value = []
        batchAiArticlePresetLoaded.value = false
        feedback.msgWarning(error?.msg || error?.message || '获取文章生成模板库失败')
    } finally {
        batchAiArticlePresetLoading.value = false
    }
}

/**
 * 应用“文章导入模板库”预设到当前批量 AI 生成表单。
 */
const handleApplyBatchAiArticlePreset = () => {
    const presetId = String(selectedBatchAiArticlePresetId.value || '').trim()
    if (!presetId) {
        feedback.msgWarning('请先选择提示词预设')
        return
    }
    const matched = batchAiArticlePresetOptions.value.find((item) => item.id === presetId)
    if (!matched) {
        feedback.msgWarning('未找到对应预设，请重新选择')
        return
    }
    batchWechatImportForm.aiModel = String(matched.model || '').trim()
    batchWechatImportForm.aiPromptTemplate = String(matched.promptTemplate || '').trim()
    feedback.msgSuccess(`已应用预设：${matched.name}`)
}

/**
 * 规范化批量导入结果行，兼容后端返回结构差异。
 */
const normalizeBatchWechatImportRows = (rows: any): BatchWechatImportResultRow[] => {
    if (!Array.isArray(rows)) return []
    return rows.map((item: any) => ({
        status: String(item?.status || '').trim().toLowerCase(),
        url: String(item?.url || '').trim(),
        articleId:
            Number.isFinite(Number(item?.articleId)) && Number(item?.articleId) > 0
                ? Number(item?.articleId)
                : undefined,
        title: String(item?.title || '').trim(),
        reason: String(item?.reason || '').trim(),
        templateName: String(item?.templateName || '').trim(),
        modelName: String(item?.modelName || item?.aiModelUsed || '').trim()
    }))
}

/**
 * 格式化批量 AI 结果中的“模板/模型”展示文本。
 */
const formatBatchAiMetaText = (row: BatchWechatImportResultRow) => {
    const templateName = String(row?.templateName || '').trim()
    const modelName = String(row?.modelName || '').trim()
    if (templateName && modelName) return `${templateName} / ${modelName}`
    if (templateName) return `${templateName} / -`
    if (modelName) return `- / ${modelName}`
    return '-'
}

/**
 * 提交批量导入文章任务。
 */
const handleBatchWechatImportSubmit = async () => {
    const cid = Number(batchWechatImportForm.cid || 0)
    const author = String(batchWechatImportForm.author || '').trim()
    const urlsText = String(batchWechatImportForm.urlsText || '').trim()
    const topicsText = String(batchWechatImportForm.topicsText || '').trim()
    const matchedAiPreset = batchAiArticlePresetOptions.value.find(
        (item) => item.id === String(selectedBatchAiArticlePresetId.value || '').trim()
    )
    if (!Number.isInteger(cid) || cid <= 0) {
        feedback.msgWarning('请选择文章栏目')
        return
    }
    if (!author) {
        feedback.msgWarning('请选择作者')
        return
    }
    if (batchWechatImportForm.mode === 'wechatImport' && !urlsText) {
        feedback.msgWarning('请至少输入一个公众号链接')
        return
    }
    if (batchWechatImportForm.mode === 'aiGenerate' && !topicsText) {
        feedback.msgWarning('请至少输入一个文章选题')
        return
    }
    batchWechatImportLoading.value = true
    try {
        const result: any = batchWechatImportForm.mode === 'aiGenerate'
            ? await articleGenerateAiBatch({
                cid,
                author,
                topics: topicsText,
                status: batchWechatImportForm.status,
                aiModel: String(batchWechatImportForm.aiModel || '').trim(),
                aiPromptTemplate: String(batchWechatImportForm.aiPromptTemplate || '').trim(),
                aiTemplateId: String(selectedBatchAiArticlePresetId.value || '').trim(),
                aiTemplateName: String(matchedAiPreset?.name || '').trim()
            })
            : await articleImportWechatBatch({
                cid,
                author,
                urls: urlsText,
                status: batchWechatImportForm.status,
                aiEnabled: batchWechatImportForm.aiEnabled === true
            })
        const normalizedRows = normalizeBatchWechatImportRows(result?.rows || result?.data?.rows || [])
        batchWechatImportResult.value = {
            created: Number(result?.created || result?.data?.created || 0),
            failed: Number(result?.failed || result?.data?.failed || 0),
            rows: normalizedRows
        }
        feedback.msgSuccess(
            `${batchWechatImportForm.mode === 'aiGenerate' ? '生成' : '导入'}完成：新增 ${batchWechatImportResult.value.created} 条，失败 ${batchWechatImportResult.value.failed} 条`
        )
        resetPage()
    } catch (error: any) {
        feedback.msgError(
            error?.message || (batchWechatImportForm.mode === 'aiGenerate' ? '批量AI生成文章失败' : '批量导入文章失败')
        )
    } finally {
        batchWechatImportLoading.value = false
    }
}

/**
 * 打开批量编辑弹窗并重置表单
 */
const openBatchEditDialog = () => {
    if (selectedIds.value.length === 0) {
        feedback.msgWarning('请先勾选要批量编辑的文章')
        return
    }
    batchEditForm.applyCid = false
    batchEditForm.cid = ''
    batchEditForm.applyTagIds = false
    batchEditForm.tagIds = []
    batchEditForm.applyTopicId = false
    batchEditForm.topicId = 0
    batchEditForm.applyIsShow = false
    batchEditForm.isShow = 1
    batchEditForm.applySeo = false
    batchEditForm.seoTitleTemplate = ''
    batchEditForm.seoDescriptionTemplate = ''
    batchEditDialogVisible.value = true
}

/**
 * 提交批量编辑任务
 */
const handleBatchEditSubmit = async () => {
    if (selectedIds.value.length === 0) {
        feedback.msgWarning('请选择要批量编辑的文章')
        return
    }
    if (!batchEditForm.applyCid && !batchEditForm.applyTagIds && !batchEditForm.applyTopicId && !batchEditForm.applyIsShow && !batchEditForm.applySeo) {
        feedback.msgWarning('请至少选择一项批量编辑内容')
        return
    }
    if (batchEditForm.applyCid && !Number(batchEditForm.cid || 0)) {
        feedback.msgWarning('请选择栏目')
        return
    }

    batchEditLoading.value = true
    try {
        await articleBatchEdit({
            ids: selectedIds.value,
            applyCid: batchEditForm.applyCid,
            cid: Number(batchEditForm.cid || 0),
            applyTagIds: batchEditForm.applyTagIds,
            tagIds: batchEditForm.tagIds,
            applyTopicId: batchEditForm.applyTopicId,
            topicId: Number(batchEditForm.topicId || 0),
            applyIsShow: batchEditForm.applyIsShow,
            isShow: Number(batchEditForm.isShow || 0),
            applySeo: batchEditForm.applySeo,
            seoTitleTemplate: String(batchEditForm.seoTitleTemplate || ''),
            seoDescriptionTemplate: String(batchEditForm.seoDescriptionTemplate || '')
        })
        feedback.msgSuccess(`批量编辑成功，共处理 ${selectedIds.value.length} 篇文章`)
        batchEditDialogVisible.value = false
        selectedIds.value = []
        getLists()
    } catch (error: any) {
        feedback.msgError(error?.message || '批量编辑失败')
    } finally {
        batchEditLoading.value = false
    }
}

/**
 * 拉取回收站策略配置
 */
const loadRecyclePolicyConfig = async () => {
    try {
        const data: any = await articleRecyclePolicyConfig()
        recyclePolicyForm.enabled = data?.enabled === true
        recyclePolicyForm.retentionDays = Number(data?.retentionDays || 30)
        recyclePolicyForm.intervalHours = Number(data?.intervalHours || 12)
        recyclePolicyForm.lastCleanupTime = Number(data?.lastCleanupTime || 0)
    } catch (error) {
        recyclePolicyForm.enabled = false
        recyclePolicyForm.retentionDays = 30
        recyclePolicyForm.intervalHours = 12
        recyclePolicyForm.lastCleanupTime = 0
    }
}

/**
 * 打开回收站策略弹窗
 */
const openRecyclePolicyDialog = async () => {
    await loadRecyclePolicyConfig()
    recyclePolicyDialogVisible.value = true
}

/**
 * 保存回收站策略
 */
const handleRecyclePolicySave = async () => {
    recyclePolicyLoading.value = true
    try {
        const data: any = await articleRecyclePolicySave({
            enabled: recyclePolicyForm.enabled === true,
            retentionDays: Number(recyclePolicyForm.retentionDays || 30),
            intervalHours: Number(recyclePolicyForm.intervalHours || 12)
        })
        recyclePolicyForm.enabled = data?.enabled === true
        recyclePolicyForm.retentionDays = Number(data?.retentionDays || 30)
        recyclePolicyForm.intervalHours = Number(data?.intervalHours || 12)
        recyclePolicyForm.lastCleanupTime = Number(data?.lastCleanupTime || 0)
        feedback.msgSuccess('回收策略已保存')
        recyclePolicyDialogVisible.value = false
    } catch (error: any) {
        feedback.msgError(error?.message || '保存回收策略失败')
    } finally {
        recyclePolicyLoading.value = false
    }
}

/**
 * 立即执行回收站清理
 */
const handleRecyclePolicyCleanupNow = async () => {
    recyclePolicyCleanupLoading.value = true
    try {
        const data: any = await articleRecyclePolicyCleanup()
        recyclePolicyForm.lastCleanupTime = Number(data?.cleanupTime || Math.floor(Date.now() / 1000))
        const deletedCount = Number(data?.deletedCount || 0)
        const checkedCount = Number(data?.checkedCount || 0)
        feedback.msgSuccess(`清理完成：已删除 ${deletedCount} 篇，扫描 ${checkedCount} 篇`)
        if (Number(queryParams.recycleBin || 0) === 1) {
            getLists()
        }
    } catch (error: any) {
        feedback.msgError(error?.message || '执行清理失败')
    } finally {
        recyclePolicyCleanupLoading.value = false
    }
}

/**
 * 应用文章列表快捷筛选
 */
const applyQuickFilter = (type: 'all' | 'pendingReview' | 'published' | 'draft' | 'recycle') => {
    if (type === 'all') {
        queryParams.recycleBin = 0
        queryParams.isShow = ''
        queryParams.reviewStatus = ''
    }
    if (type === 'pendingReview') {
        queryParams.recycleBin = 0
        queryParams.isShow = ''
        queryParams.reviewStatus = 1 as any
    }
    if (type === 'published') {
        queryParams.recycleBin = 0
        queryParams.isShow = 1 as any
        queryParams.reviewStatus = ''
    }
    if (type === 'draft') {
        queryParams.recycleBin = 0
        queryParams.isShow = 0 as any
        queryParams.reviewStatus = ''
    }
    if (type === 'recycle') {
        queryParams.recycleBin = 1
        queryParams.isShow = ''
        queryParams.reviewStatus = ''
    }
    resetPage()
}

/**
 * 判断文章快捷筛选按钮是否激活。
 * @param type 快捷筛选类型
 */
const isQuickFilterActive = (type: 'all' | 'pendingReview' | 'published' | 'draft' | 'recycle') => {
    if (type === 'recycle') {
        return Number(queryParams.recycleBin || 0) === 1
    }
    if (Number(queryParams.recycleBin || 0) === 1) {
        return false
    }
    if (type === 'all') {
        return !queryParams.isShow && !queryParams.reviewStatus
    }
    if (type === 'pendingReview') {
        return !queryParams.isShow && Number(queryParams.reviewStatus) === 1
    }
    if (type === 'published') {
        return Number(queryParams.isShow) === 1
    }
    return Number(queryParams.isShow) === 0
}

watch(
    () => pager.lists,
    () => {
        selectedIds.value = []
    }
)

onActivated(() => {
    getLists()
})

getLists()
</script>

<style scoped>
.article-summary {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
}

.article-actions {
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.article-quick-filters {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
}

.article-quick-filters__label {
    font-size: 12px;
    color: #909399;
}
</style>
