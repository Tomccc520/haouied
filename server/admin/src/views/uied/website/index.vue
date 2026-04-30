<!--
 * @file views/uied/website/index.vue
 * @description UIED 网站管理列表页面
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 3.1.0 - 增加前端路径快捷查看列
-->
<template>
    <div class="website-lists">
        <el-card class="!border-none" shadow="never">
            <el-alert
                title="筛选提示：支持多状态 + 多标记组合筛选；草稿支持前端预览（自动带 preview 参数）。"
                type="info"
                :closable="false"
                class="mb-4"
            />
            <el-form ref="formRef" class="mb-[-16px]" :model="queryParams" :inline="true">
                <el-form-item label="网站名称">
                    <el-input
                        class="w-[200px]"
                        v-model="queryParams.keyword"
                        placeholder="搜索名称/描述/URL"
                        clearable
                        @keyup.enter="resetPage"
                        @clear="resetPage"
                    />
                </el-form-item>
                <el-form-item label="所属分类">
                    <el-select
                        class="w-[200px]"
                        v-model="queryParams.categoryId"
                        filterable
                        clearable
                        placeholder="搜索/选择分类"
                        no-data-text="未匹配到分类"
                        @change="resetPage"
                    >
                        <el-option
                            v-for="item in categoryOptions"
                            :key="item.id"
                            :label="item.pathLabelWithSlug || item.label"
                            :value="item.id"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item>
                    <el-checkbox
                        v-model="queryParams.includeChildren"
                        :disabled="!queryParams.categoryId"
                        @change="resetPage"
                    >
                        包含子分类
                    </el-checkbox>
                </el-form-item>
                <el-form-item label="显示状态">
                    <el-select
                        class="w-[220px]"
                        v-model="queryParams.statusList"
                        multiple
                        collapse-tags
                        collapse-tags-tooltip
                        clearable
                        placeholder="多选状态"
                        @change="resetPage"
                    >
                        <el-option label="显示/已发布" value="active" />
                        <el-option label="隐藏" value="disabled" />
                        <el-option label="待审核" value="unchecked" />
                        <el-option label="草稿" value="draft" />
                        <el-option label="异常" value="failed" />
                    </el-select>
                </el-form-item>
                <el-form-item label="标记筛选">
                    <el-select
                        class="w-[220px]"
                        v-model="queryParams.flagList"
                        multiple
                        collapse-tags
                        collapse-tags-tooltip
                        clearable
                        placeholder="多选标记"
                        @change="resetPage"
                    >
                        <el-option label="置顶" value="pinned" />
                        <el-option label="热门" value="hot" />
                        <el-option label="推荐" value="featured" />
                        <el-option label="新站" value="new" />
                    </el-select>
                </el-form-item>
                <el-form-item label="排序方式">
                    <el-select
                        class="w-[180px]"
                        v-model="queryParams.sortBy"
                        clearable
                        placeholder="默认排序"
                        @change="resetPage"
                    >
                        <el-option label="默认（置顶 + 排序值）" value="default" />
                        <el-option label="排序值 升序" value="sort_asc" />
                        <el-option label="排序值 降序" value="sort_desc" />
                        <el-option label="点击量 降序" value="click_desc" />
                        <el-option label="创建时间 新->旧" value="create_desc" />
                        <el-option label="创建时间 旧->新" value="create_asc" />
                        <el-option label="更新时间 新->旧" value="update_desc" />
                        <el-option label="更新时间 旧->新" value="update_asc" />
                    </el-select>
                </el-form-item>
                <el-form-item label="详情内容">
                    <el-select
                        class="w-[140px]"
                        v-model="queryParams.hasDetailContent"
                        clearable
                        placeholder="全部"
                        @change="resetPage"
                    >
                        <el-option label="有详情" value="1" />
                        <el-option label="无详情" value="0" />
                    </el-select>
                </el-form-item>
                <el-form-item label="缩略图">
                    <el-select
                        class="w-[140px]"
                        v-model="queryParams.hasThumbnail"
                        clearable
                        placeholder="全部"
                        @change="resetPage"
                    >
                        <el-option label="有缩略图" value="1" />
                        <el-option label="无缩略图" value="0" />
                    </el-select>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="resetPage">查询</el-button>
                    <el-button @click="resetParams">重置</el-button>
                </el-form-item>
            </el-form>
        </el-card>
        <el-card class="!border-none mt-4" shadow="never">
            <div class="mb-4 flex justify-between">
                <div class="flex flex-wrap gap-2">
                    <template v-if="!isRecycleBinMode">
                        <el-button type="primary" @click="handleAdd">
                            <template #icon><icon name="el-icon-Plus" /></template>
                            添加网站
                        </el-button>
                        <el-button type="success" plain @click="openBatchImportDialog">
                            批量导入网址
                        </el-button>
                        <el-button
                            type="danger"
                            :disabled="!selectedIds.length"
                            @click="handleBatchDelete"
                        >
                            批量删除
                        </el-button>
                        <el-button
                            type="warning"
                            plain
                            :loading="batchGenerateDetailLoading"
                            :disabled="!selectedIds.length || batchGenerateDetailLoading"
                            @click="handleBatchGenerateDetailContent"
                        >
                            批量AI生成正文
                        </el-button>
                        <el-button
                            type="info"
                            plain
                            :disabled="batchWeightTagLoading"
                            @click="openBatchWeightTagDialog"
                        >
                            批量权重标签
                        </el-button>
                        <el-button
                            type="warning"
                            plain
                            :disabled="!selectedIds.length || batchMoveLoading"
                            @click="openBatchMoveDialog"
                        >
                            批量移动分类/标签
                        </el-button>
                    </template>
                    <template v-else>
                        <el-button
                            type="success"
                            :disabled="!selectedIds.length"
                            @click="handleBatchRestore"
                        >
                            批量恢复
                        </el-button>
                        <el-button
                            type="danger"
                            :disabled="!selectedIds.length"
                            @click="handleBatchRealDelete"
                        >
                            彻底删除
                        </el-button>
                        <el-button
                            type="danger"
                            plain
                            :disabled="pager.loading || Number(pager.count || 0) <= 0"
                            @click="handleClearRecycle"
                        >
                            一键清空回收站
                        </el-button>
                    </template>
                </div>
                <div class="text-gray-400">
                    <template v-if="isRecycleBinMode">
                        <el-tag type="warning" effect="plain">回收站 {{ pager.count }} 个网站</el-tag>
                    </template>
                    <template v-else>共 {{ pager.count }} 个网站</template>
                </div>
            </div>
            <div class="website-quick-filters mb-3">
                <span class="website-quick-filters__label">快捷筛选</span>
                <el-button
                    size="small"
                    :type="isWebsiteQuickFilterActive('all') ? 'primary' : undefined"
                    @click="applyWebsiteQuickFilter('all')"
                >
                    全部
                </el-button>
                <el-button
                    size="small"
                    :type="isWebsiteQuickFilterActive('published') ? 'success' : undefined"
                    :plain="!isWebsiteQuickFilterActive('published')"
                    @click="applyWebsiteQuickFilter('published')"
                >
                    已发布
                </el-button>
                <el-button
                    size="small"
                    :type="isWebsiteQuickFilterActive('draft') ? 'info' : undefined"
                    :plain="!isWebsiteQuickFilterActive('draft')"
                    @click="applyWebsiteQuickFilter('draft')"
                >
                    草稿
                </el-button>
                <el-button
                    size="small"
                    :type="isWebsiteQuickFilterActive('recycle') ? 'warning' : undefined"
                    :plain="!isWebsiteQuickFilterActive('recycle')"
                    @click="applyWebsiteQuickFilter('recycle')"
                >
                    回收站
                </el-button>
                <template v-if="isRecycleBinMode">
                    <span class="website-quick-filters__label website-quick-filters__label--type">回收类型</span>
                    <el-select
                        v-model="recycleTypeFilter"
                        size="small"
                        class="website-quick-filters__type-select"
                        @change="handleRecycleTypeChange"
                    >
                        <el-option label="全部类型" value="all" />
                        <el-option label="已发布" value="active" />
                        <el-option label="草稿" value="draft" />
                        <el-option label="隐藏" value="disabled" />
                        <el-option label="待审核" value="unchecked" />
                    </el-select>
                </template>
            </div>
            <el-table
                size="large"
                v-loading="pager.loading"
                :data="pager.lists"
                @selection-change="handleSelectionChange"
            >
                <el-table-column type="selection" width="50" />
                <el-table-column label="ID" prop="id" width="80" />
                <el-table-column label="图标" width="70">
                    <template #default="{ row }">
                        <el-avatar
                            v-if="row.iconUrl"
                            :src="row.iconUrl"
                            :size="32"
                            shape="square"
                        />
                        <el-avatar v-else :size="32" shape="square">
                            {{ row.name?.charAt(0) }}
                        </el-avatar>
                    </template>
                </el-table-column>
                <el-table-column label="网站信息" min-width="220" show-overflow-tooltip>
                    <template #default="{ row }">
                        <div class="font-medium text-primary">{{ row.name || '-' }}</div>
                        <div class="text-xs text-gray-400 mt-1">slug：{{ row.slug || '-' }}</div>
                    </template>
                </el-table-column>
                <el-table-column label="分类" min-width="180" show-overflow-tooltip>
                    <template #default="{ row }">
                        <el-tag
                            v-for="categoryName in getWebsiteCategoryNames(row)"
                            :key="`${row.id}-${categoryName}`"
                            size="small"
                            class="mr-1 mb-1"
                        >
                            {{ categoryName }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="URL" min-width="200" show-overflow-tooltip>
                    <template #default="{ row }">
                        <a
                            :href="row.url"
                            target="_blank"
                            class="text-primary hover:underline"
                            @click.prevent="handleOpenWebsiteUrl(row)"
                        >{{
                            row.url
                        }}</a>
                    </template>
                </el-table-column>
                <el-table-column label="前端路径" min-width="180" show-overflow-tooltip>
                    <template #default="{ row }">
                        <a
                            :href="getFrontendUrl(row)"
                            target="_blank"
                            class="text-primary hover:underline"
                            @click.prevent="handleOpenFrontendLink(row)"
                        >
                            {{ getFrontendPath(row) }}
                        </a>
                    </template>
                </el-table-column>
                <el-table-column label="前端" width="80" align="center">
                    <template #default="{ row }">
                        <a
                            :href="getFrontendUrl(row)"
                            target="_blank"
                            @click.prevent="handleOpenFrontendLink(row)"
                        >
                            <el-button type="primary" link size="small">
                                {{ isDraftWebsite(row) ? '预览' : '查看' }}
                            </el-button>
                        </a>
                    </template>
                </el-table-column>
                <el-table-column label="点击量" width="90">
                    <template #default="{ row }">{{ formatIntegerCount(row.clickCount) }}</template>
                </el-table-column>
                <el-table-column label="标记" min-width="180" show-overflow-tooltip>
                    <template #default="{ row }">
                        <el-space wrap :size="4">
                            <el-tag v-if="row.isPinned" size="small" type="danger">置顶</el-tag>
                            <el-tag v-if="row.isHot" size="small" type="warning">热门</el-tag>
                            <el-tag v-if="row.isFeatured" size="small" type="success">推荐</el-tag>
                            <el-tag v-if="row.isNew" size="small" type="info">新站</el-tag>
                            <el-tag
                                v-for="weightTag in normalizeWeightTags(row.weightTags)"
                                :key="`${row.id}-weight-${weightTag}`"
                                size="small"
                                effect="plain"
                            >
                                {{ getWeightTagLabel(weightTag) }}
                            </el-tag>
                        </el-space>
                    </template>
                </el-table-column>
                <el-table-column label="更新时间" width="168">
                    <template #default="{ row }">{{ formatUnixDateTime(row.updatedAt) }}</template>
                </el-table-column>
                <el-table-column label="排序" prop="sortOrder" width="80" />
                <el-table-column label="状态" width="92">
                    <template #default="{ row }">
                        <el-tag :type="getWebsiteStatusTagType(row.status)" size="small">
                            {{ getWebsiteStatusLabel(row.status) }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="操作" width="190" fixed="right">
                    <template #default="{ row }">
                        <el-button type="info" link @click="handleOpenDetailDrawer(row)">详情</el-button>
                        <el-button v-if="!isRecycleBinMode" type="primary" link @click="handleEdit(row)">
                            编辑
                        </el-button>
                        <el-button
                            v-if="!isRecycleBinMode"
                            type="danger"
                            link
                            @click="handleDelete(row.id)"
                        >
                            删除
                        </el-button>
                        <el-button
                            v-if="isRecycleBinMode"
                            type="success"
                            link
                            @click="handleRestore(row.id)"
                        >
                            恢复
                        </el-button>
                        <el-button
                            v-if="isRecycleBinMode"
                            type="danger"
                            link
                            @click="handleRealDelete(row.id)"
                        >
                            彻底删除
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
            <div class="flex justify-end mt-4">
                <pagination v-model="pager" @change="getLists" />
            </div>
        </el-card>

        <el-drawer
            v-model="websiteDetailDrawerVisible"
            title="网站详情与点击数据"
            class="website-detail-drawer"
            size="900px"
            destroy-on-close
        >
            <el-skeleton v-if="websiteDetailDrawerLoading" :rows="10" animated />
            <template v-else-if="websiteDetailData">
                <div class="website-detail-panel">
                    <section class="website-detail-hero">
                        <div class="website-detail-hero__content">
                            <div class="website-detail-hero__eyebrow">
                                WEBSITE #{{ websiteDetailData.id || '-' }}
                            </div>
                            <h2 class="website-detail-hero__title">
                                {{ websiteDetailData.name || '未命名网站' }}
                            </h2>
                            <div class="website-detail-hero__meta">
                                <el-tag :type="getWebsiteStatusTagType(websiteDetailData.status)" effect="dark">
                                    {{ getWebsiteStatusLabel(websiteDetailData.status) }}
                                </el-tag>
                                <span>{{ getDetailCategoryText(websiteDetailData) }}</span>
                                <span>固定链接：{{ websiteDetailData.slug || '-' }}</span>
                            </div>
                        </div>
                        <div class="website-detail-hero__actions">
                            <el-button type="primary" @click="handleOpenFrontendLink(websiteDetailData)">
                                打开前端页
                            </el-button>
                            <el-button plain @click="handleOpenWebsiteUrl(websiteDetailData)">
                                访问原站
                            </el-button>
                        </div>
                    </section>

                    <section class="website-detail-link-card">
                        <div class="website-detail-link-card__item">
                            <span>网站 URL</span>
                            <a
                                :href="websiteDetailData.url"
                                target="_blank"
                                @click.prevent="handleOpenWebsiteUrl(websiteDetailData)"
                            >
                                {{ websiteDetailData.url || '-' }}
                            </a>
                        </div>
                        <div class="website-detail-link-card__item">
                            <span>前端路径</span>
                            <a
                                :href="getFrontendUrl(websiteDetailData)"
                                target="_blank"
                                @click.prevent="handleOpenFrontendLink(websiteDetailData)"
                            >
                                {{ getFrontendPath(websiteDetailData) }}
                            </a>
                        </div>
                        <div class="website-detail-link-card__time">
                            创建：{{ formatUnixDateTime(websiteDetailData.createdAt) }}
                            <br />
                            更新：{{ formatUnixDateTime(websiteDetailData.updatedAt) }}
                        </div>
                    </section>

                    <section class="website-detail-section">
                        <div class="website-detail-section__head">
                            <div>
                                <h3>点击与流量</h3>
                                <p>点击量为系统自动埋点；访问时长、跳出率与来源占比为后台录入数据。</p>
                            </div>
                            <el-tag effect="plain" type="success">自动点击 + 手动流量</el-tag>
                        </div>
                        <div class="website-metric-grid">
                            <div
                                v-for="metric in getWebsiteDetailMetricCards(websiteDetailData)"
                                :key="metric.key"
                                class="website-metric-card"
                                :class="`website-metric-card--${metric.tone}`"
                            >
                                <span class="website-metric-card__label">{{ metric.label }}</span>
                                <strong>{{ metric.value }}</strong>
                                <small>{{ metric.helper }}</small>
                            </div>
                        </div>
                    </section>

                    <section class="website-detail-section">
                        <div class="website-detail-section__head">
                            <div>
                                <h3>来源占比</h3>
                                <p>
                                    {{ hasTrafficMetricData(websiteDetailData.trafficMetrics)
                                        ? '展示后台录入或第三方估算的渠道百分比。'
                                        : '暂未录入来源占比，官网真实来源需要接入独立统计脚本。' }}
                                </p>
                            </div>
                            <el-tag :type="getTrafficDataSourceTagType(websiteDetailData.trafficMetrics)" effect="plain">
                                {{ getTrafficDataSourceLabel(websiteDetailData.trafficMetrics) }}
                            </el-tag>
                        </div>
                        <div class="website-source-list">
                            <div
                                v-for="sourceItem in resolveTrafficSourceItems(websiteDetailData.trafficMetrics?.sourceBreakdown)"
                                :key="sourceItem.key"
                                class="website-source-list__row"
                            >
                                <div class="website-source-list__label">
                                    <span>{{ sourceItem.label }}</span>
                                    <strong>{{ sourceItem.value }}</strong>
                                </div>
                                <el-progress
                                    :percentage="sourceItem.percent"
                                    :stroke-width="8"
                                    :show-text="false"
                                    :color="sourceItem.color"
                                />
                            </div>
                        </div>
                    </section>

                    <section class="website-detail-section website-detail-section--two">
                        <div class="website-seo-card">
                            <h3>SEO 信息</h3>
                            <dl>
                                <dt>SEO 标题</dt>
                                <dd>{{ websiteDetailData.seoTitle || '-' }}</dd>
                                <dt>SEO 描述</dt>
                                <dd>{{ websiteDetailData.seoDescription || '-' }}</dd>
                                <dt>SEO 关键词</dt>
                                <dd>{{ websiteDetailData.seoKeywords || '-' }}</dd>
                            </dl>
                        </div>
                        <div class="website-seo-card">
                            <h3>内容完整度</h3>
                            <dl>
                                <dt>简介描述</dt>
                                <dd>{{ websiteDetailData.description || '-' }}</dd>
                                <dt>正文长度</dt>
                                <dd>{{ getDetailContentLengthLabel(websiteDetailData.detailContent) }}</dd>
                                <dt>数据备注</dt>
                                <dd>{{ websiteDetailData.trafficMetrics?.remark || '-' }}</dd>
                            </dl>
                        </div>
                    </section>
                </div>
            </template>
            <el-empty v-else description="暂无网站详情数据" />
        </el-drawer>

        <el-dialog
            v-model="batchImportDialogVisible"
            title="批量导入网址"
            width="760px"
            :close-on-click-modal="!batchImportLoading"
            :close-on-press-escape="!batchImportLoading"
            :show-close="!batchImportLoading"
            :before-close="handleBatchImportDialogBeforeClose"
            destroy-on-close
        >
            <div
                v-loading="batchImportLoading"
                element-loading-text="正在批量导入，请勿关闭弹窗或切换页面..."
            >
                <el-alert
                    v-if="batchImportLoading"
                    class="mb-4"
                    type="warning"
                    :closable="false"
                    title="导入进行中：已锁定弹窗关闭与页面离开，任务完成后会自动展示结果明细。"
                />
                <el-form :model="batchImportForm" label-width="120px">
                    <el-form-item label="所属分类" required>
                        <el-select
                            v-model="batchImportForm.categoryIds"
                            placeholder="输入分类名/路径/别名搜索（可多选）"
                            multiple
                            filterable
                            :reserve-keyword="false"
                            :filter-method="handleBatchImportCategoryFilter"
                            @visible-change="handleBatchImportCategoryVisibleChange"
                            :no-data-text="
                                batchImportCategorySearchKeyword ? '未匹配到分类，请换个关键词' : '暂无可选分类'
                            "
                            clearable
                            collapse-tags
                            :max-collapse-tags="4"
                            collapse-tags-tooltip
                            style="width: 100%"
                            :disabled="batchImportLoading"
                        >
                            <el-option
                                v-for="item in batchImportCategoryOptions"
                                :key="item.id"
                                :label="item.pathLabelWithSlug || item.pathLabel || item.label"
                                :value="item.id"
                            >
                                <div class="flex items-center justify-between">
                                    <span>{{ item.pathLabel || item.name }}</span>
                                    <span v-if="item.slug" class="text-xs text-gray-400">/{{ item.slug }}</span>
                                </div>
                            </el-option>
                        </el-select>
                        <div class="mt-2 flex items-center justify-between flex-wrap gap-2">
                            <div class="text-xs text-tx-secondary">
                                已选 {{ selectedBatchImportCategoryCount }} 个 / 当前可选 {{ batchImportSelectableCategoryCount }} 个
                            </div>
                            <el-space :size="8">
                                <el-button
                                    size="small"
                                    link
                                    type="primary"
                                    :disabled="batchImportLoading || batchImportSelectableCategoryCount === 0"
                                    @click="handleBatchImportSelectAllFiltered(false)"
                                >
                                    全选当前筛选
                                </el-button>
                                <el-button
                                    size="small"
                                    link
                                    type="primary"
                                    :disabled="batchImportLoading || batchImportSelectableLeafCategoryCount === 0"
                                    @click="handleBatchImportSelectAllFiltered(true)"
                                >
                                    仅选末级分类
                                </el-button>
                                <el-button
                                    size="small"
                                    link
                                    :disabled="batchImportLoading || selectedBatchImportCategoryCount === 0"
                                    @click="handleBatchImportClearCategories"
                                >
                                    清空已选
                                </el-button>
                            </el-space>
                        </div>
                        <div class="text-xs text-tx-secondary mt-1">
                            支持按分类名称、层级路径、别名（slug）搜索；可多选，第一项会作为主分类，后续可在“编辑网站”中切换顺序。
                        </div>
                    </el-form-item>
                    <el-form-item label="主分类" required>
                        <el-select
                            v-model="batchImportForm.primaryCategoryId"
                            placeholder="搜索/选择主分类"
                            filterable
                            no-data-text="暂无已选分类"
                            :disabled="
                                selectedBatchImportCategoryOptions.length === 0 || batchImportLoading
                            "
                            clearable
                            style="width: 100%"
                        >
                            <el-option
                                v-for="item in selectedBatchImportCategoryOptions"
                                :key="item.id"
                                :label="item.pathLabelWithSlug || item.pathLabel || item.label"
                                :value="item.id"
                            />
                        </el-select>
                        <div class="text-xs text-tx-secondary mt-2">
                            主分类用于默认归属展示；你可以随时切换，不影响多分类关联。
                        </div>
                    </el-form-item>
                    <el-form-item label="网址列表" required>
                        <el-input
                            v-model="batchImportForm.urlsText"
                            type="textarea"
                            :rows="9"
                            placeholder="每行一个网址，支持不带协议（示例：openai.com）"
                            :disabled="batchImportLoading"
                        />
                        <div class="text-xs text-tx-secondary mt-2">
                            导入规则：自动检测重复主域名，默认仅提醒并继续导入。
                        </div>
                    </el-form-item>
                    <el-form-item label="发布状态">
                        <el-radio-group
                            v-model="batchImportForm.status"
                            :disabled="batchImportLoading"
                        >
                            <el-radio-button label="draft">草稿</el-radio-button>
                            <el-radio-button label="active">发布</el-radio-button>
                            <el-radio-button label="disabled">隐藏</el-radio-button>
                        </el-radio-group>
                    </el-form-item>
                    <el-form-item label="导入选项">
                        <el-space direction="vertical" alignment="start" :size="8">
                            <el-checkbox v-model="batchImportForm.allowDuplicate" :disabled="batchImportLoading">
                                重复主域名仅提醒，继续导入
                            </el-checkbox>
                            <el-checkbox v-model="batchImportForm.fetchSeo" :disabled="batchImportLoading">
                                自动获取网站信息（标题/简介/关键词/标签/favicon）
                            </el-checkbox>
                            <el-checkbox
                                v-model="batchImportForm.generateDetailContent"
                                :disabled="batchImportLoading"
                            >
                                导入后自动用 AI 生成详情正文
                            </el-checkbox>
                            <div
                                v-if="batchImportForm.generateDetailContent"
                                class="text-xs text-tx-secondary"
                            >
                                模型与提示词请在「AI 助手管理 -> 导入配置」中统一设置。
                            </div>
                        </el-space>
                    </el-form-item>
                </el-form>

                <el-skeleton v-if="batchImportLoading" class="mt-2" :rows="3" animated />

                <el-alert
                    v-if="batchImportResult"
                    class="mt-2"
                    type="info"
                    :closable="false"
                    :title="`导入结果：新增 ${batchImportResult.created}，跳过 ${batchImportResult.skipped}，失败 ${batchImportResult.failed}`"
                />
                <el-card
                    v-if="batchImportResult && batchImportResult.rows.length > 0"
                    class="mt-3"
                    shadow="never"
                >
                    <template #header>
                        <div class="flex items-center justify-between">
                            <span>结果明细（{{ batchImportResult.rows.length }} 条）</span>
                            <el-button link type="primary" @click="handleExportBatchImportCsv">
                                一键导出 CSV
                            </el-button>
                        </div>
                    </template>
                    <el-table :data="batchImportResult.rows" size="small" max-height="320">
                        <el-table-column type="index" label="#" width="56" />
                        <el-table-column label="状态" width="88">
                            <template #default="{ row }">
                                <el-tag :type="getBatchImportStatusTagType(row.status)" size="small">
                                    {{ getBatchImportStatusLabel(row.status) }}
                                </el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column label="网址" min-width="220" show-overflow-tooltip>
                            <template #default="{ row }">{{ row.url || '-' }}</template>
                        </el-table-column>
                        <el-table-column label="网站ID" width="90">
                            <template #default="{ row }">{{ row.websiteId || '-' }}</template>
                        </el-table-column>
                        <el-table-column label="网站名称" min-width="160" show-overflow-tooltip>
                            <template #default="{ row }">{{ row.name || '-' }}</template>
                        </el-table-column>
                        <el-table-column label="原因/说明" min-width="240" show-overflow-tooltip>
                            <template #default="{ row }">{{ row.reason || row.message || '-' }}</template>
                        </el-table-column>
                    </el-table>
                </el-card>
            </div>

            <template #footer>
                <el-button :disabled="batchImportLoading" @click="batchImportDialogVisible = false">
                    取消
                </el-button>
                <el-button
                    type="primary"
                    :loading="batchImportLoading"
                    :disabled="batchImportLoading"
                    @click="handleBatchImportSubmit"
                >
                    开始导入
                </el-button>
            </template>
        </el-dialog>

        <el-dialog
            v-model="batchGenerateDetailProgressVisible"
            title="批量AI生成正文进行中"
            width="560px"
            :close-on-click-modal="false"
            :close-on-press-escape="false"
            :show-close="false"
            :before-close="handleBatchGenerateProgressBeforeClose"
            destroy-on-close
        >
            <el-alert
                type="warning"
                :closable="false"
                :title="`正在处理 ${batchGenerateTargetCount} 个网站，期间请勿关闭页面。`"
            />
            <el-skeleton class="mt-4" :rows="4" animated />
            <div class="text-xs text-tx-secondary mt-3">
                说明：该任务会逐条调用模型接口，耗时与模型负载和网络状况相关，完成后会自动弹出结果明细。
            </div>
            <template #footer>
                <el-button disabled>处理中...</el-button>
            </template>
        </el-dialog>

        <el-dialog
            v-model="batchGenerateDetailResultVisible"
            title="批量AI生成正文结果"
            width="760px"
            destroy-on-close
        >
            <el-alert
                v-if="batchGenerateDetailResult"
                type="info"
                :closable="false"
                :title="`总计 ${batchGenerateDetailResult.total} 条：成功 ${batchGenerateDetailResult.success}，跳过 ${batchGenerateDetailResult.skipped}，失败 ${batchGenerateDetailResult.failed}`"
            />
            <el-table
                v-if="batchGenerateDetailResult && batchGenerateDetailResult.rows.length > 0"
                :data="batchGenerateDetailResult.rows"
                size="small"
                max-height="360"
                class="mt-3"
            >
                <el-table-column type="index" label="#" width="56" />
                <el-table-column label="状态" width="88">
                    <template #default="{ row }">
                        <el-tag :type="getBatchGenerateStatusTagType(row.status)" size="small">
                            {{ getBatchGenerateStatusLabel(row.status) }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="网站ID" width="88">
                    <template #default="{ row }">{{ row.websiteId || '-' }}</template>
                </el-table-column>
                <el-table-column label="网站名称" min-width="160" show-overflow-tooltip>
                    <template #default="{ row }">{{ row.name || '-' }}</template>
                </el-table-column>
                <el-table-column label="说明" min-width="280" show-overflow-tooltip>
                    <template #default="{ row }">{{ row.reason || '-' }}</template>
                </el-table-column>
            </el-table>
            <template #footer>
                <el-button type="primary" @click="batchGenerateDetailResultVisible = false">
                    知道了
                </el-button>
            </template>
        </el-dialog>

        <el-dialog
            v-model="batchWeightTagDialogVisible"
            title="批量处理站点权重标签"
            width="620px"
            destroy-on-close
        >
            <el-alert
                type="info"
                :closable="false"
                title="仅处理当前已勾选的网站；普通标签不会受影响，只更新权重标签。"
            />
            <el-form class="mt-4" label-width="110px">
                <el-form-item label="处理模式" required>
                    <el-radio-group v-model="batchWeightTagForm.operation">
                        <el-radio-button label="add">追加标签</el-radio-button>
                        <el-radio-button label="remove">移除标签</el-radio-button>
                        <el-radio-button label="replace">覆盖标签</el-radio-button>
                        <el-radio-button label="clear">清空标签</el-radio-button>
                    </el-radio-group>
                </el-form-item>
                <el-form-item label="权重标签" required>
                    <el-select
                        v-model="batchWeightTagForm.weightTags"
                        multiple
                        filterable
                        clearable
                        collapse-tags
                        collapse-tags-tooltip
                        style="width: 100%"
                        :disabled="batchWeightTagForm.operation === 'clear'"
                    >
                        <el-option
                            v-for="item in WEBSITE_WEIGHT_TAG_OPTIONS"
                            :key="item.value"
                            :label="item.label"
                            :value="item.value"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item label="目标网站">
                    <el-tag size="small" type="success">已选 {{ selectedIds.length }} 个网站</el-tag>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button :disabled="batchWeightTagLoading" @click="batchWeightTagDialogVisible = false">
                    取消
                </el-button>
                <el-button type="primary" :loading="batchWeightTagLoading" @click="handleBatchWeightTagSubmit">
                    确认处理
                </el-button>
            </template>
        </el-dialog>

        <el-dialog
            v-model="batchMoveDialogVisible"
            title="批量移动网站分类/标签"
            width="700px"
            destroy-on-close
        >
            <el-alert
                type="info"
                :closable="false"
                :title="`当前已选择 ${selectedIds.length} 个网站`"
            />
            <el-form class="mt-4" :model="batchMoveForm" label-width="130px">
                <el-form-item label="更新分类">
                    <el-switch v-model="batchMoveForm.applyCategory" />
                    <el-select
                        v-model="batchMoveForm.categoryIds"
                        class="ml-3 w-[420px]"
                        multiple
                        filterable
                        :reserve-keyword="false"
                        clearable
                        collapse-tags
                        collapse-tags-tooltip
                        placeholder="搜索/选择目标分类（第一项为主分类）"
                        no-data-text="未匹配到分类"
                        :disabled="!batchMoveForm.applyCategory || batchMoveLoading"
                    >
                        <el-option
                            v-for="item in categoryOptions"
                            :key="item.id"
                            :label="item.pathLabelWithSlug || item.pathLabel || item.label"
                            :value="item.id"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item label="更新标签">
                    <el-switch v-model="batchMoveForm.applyTags" />
                    <el-select
                        v-model="batchMoveForm.tagNames"
                        class="ml-3 w-[420px]"
                        multiple
                        filterable
                        allow-create
                        default-first-option
                        clearable
                        collapse-tags
                        collapse-tags-tooltip
                        placeholder="选择或输入标签（留空表示清空普通标签）"
                        :disabled="!batchMoveForm.applyTags || batchMoveLoading"
                    >
                        <el-option
                            v-for="item in websiteTagOptions"
                            :key="item.id"
                            :label="item.name"
                            :value="item.name"
                        />
                    </el-select>
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button :disabled="batchMoveLoading" @click="batchMoveDialogVisible = false">取消</el-button>
                <el-button type="primary" :loading="batchMoveLoading" @click="handleBatchMoveSubmit">
                    确认批量移动
                </el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script lang="ts" setup name="uiedWebsite">
import {
    uiedWebsiteList,
    uiedWebsiteDetail,
    uiedWebsiteDelete,
    uiedWebsiteBatchDelete,
    uiedWebsiteRestore,
    uiedWebsiteBatchRestore,
    uiedWebsiteRealDelete,
    uiedWebsiteBatchRealDelete,
    uiedWebsiteBatchImport,
    uiedWebsiteBatchGenerateDetailContent,
    uiedWebsiteBatchWeightTags,
    uiedWebsiteBatchMove,
    uiedWebsiteRecycleClear,
    uiedWebsiteClick,
    uiedCategoryAll,
    uiedWebsiteTagAll
} from '@/api/uied'
import { usePaging } from '@/hooks/usePaging'
import feedback from '@/utils/feedback'
import { onBeforeRouteLeave } from 'vue-router'
import { onActivated } from 'vue'

const router = useRouter()
const route = useRoute()

/**
 * 获取前端基础地址：优先读取环境变量，未配置时回退本地开发地址。
 */
const getFrontendBaseUrl = () =>
    String(import.meta.env.VITE_FRONTEND_URL || 'http://localhost:3003')
        .trim()
        .replace(/\/+$/g, '')

const FRONTEND_BASE_URL = getFrontendBaseUrl()
/**
 * 判断是否草稿网站，草稿前端链接自动附加 preview=1。
 */
const isDraftWebsite = (row: any) => String(row?.status || '').trim().toLowerCase() === 'draft'

/**
 * 生成前端详情路径：草稿自动附加 preview 参数。
 */
const getFrontendPath = (row: any) => {
    const path = row.slug || row.id
    const previewSuffix = isDraftWebsite(row) ? '?preview=1' : ''
    return `/website/${path}${previewSuffix}`
}

/**
 * 生成前端详情完整链接：用于后台快捷验证发布效果。
 */
const getFrontendUrl = (row: any) => `${FRONTEND_BASE_URL}${getFrontendPath(row)}`

/**
 * 在当前列表与详情抽屉中同步递增点击量，避免必须手动刷新才能看到变化。
 */
const increaseWebsiteClickCountLocal = (websiteId: number) => {
    if (!Number.isInteger(websiteId) || websiteId <= 0) return
    const target = pager.lists.find((item: any) => Number(item?.id) === websiteId)
    if (target) {
        const current = Number.parseInt(String(target.clickCount || 0), 10) || 0
        target.clickCount = current + 1
    }
    if (websiteDetailData.value && Number(websiteDetailData.value.id) === websiteId) {
        const current = Number.parseInt(String(websiteDetailData.value.clickCount || 0), 10) || 0
        websiteDetailData.value.clickCount = current + 1
    }
}

/**
 * 调用后端点击统计接口，统计口径与前端官网保持一致。
 */
const recordWebsiteClick = async (websiteId: number) => {
    if (!Number.isInteger(websiteId) || websiteId <= 0) return
    try {
        await uiedWebsiteClick({ id: websiteId })
        increaseWebsiteClickCountLocal(websiteId)
    } catch (error) {
        console.error('记录网站点击失败:', websiteId, error)
    }
}

/**
 * 后台打开网站外链并记录点击量：
 * 1. 同步打开新窗口，避免浏览器拦截；
 * 2. 异步记录点击统计并更新本地显示。
 */
const handleOpenWebsiteUrl = (row: any) => {
    const targetUrl = String(row?.url || '').trim()
    if (!targetUrl) {
        feedback.msgWarning('该网站未配置有效URL')
        return
    }
    window.open(targetUrl, '_blank', 'noopener,noreferrer')
    const websiteId = Number.parseInt(String(row?.id || 0), 10)
    if (!Number.isInteger(websiteId) || websiteId <= 0) return
    void recordWebsiteClick(websiteId)
}

/**
 * 后台打开前端详情页：
 * 1. 支持直接预览草稿；
 * 2. 非草稿站点同步写入点击统计，便于后台即时看到浏览量变化。
 */
const handleOpenFrontendLink = (row: any) => {
    const targetUrl = String(getFrontendUrl(row) || '').trim()
    if (!targetUrl) {
        feedback.msgWarning('前端访问链接生成失败')
        return
    }
    window.open(targetUrl, '_blank', 'noopener,noreferrer')
    if (isDraftWebsite(row)) return
    const websiteId = Number.parseInt(String(row?.id || 0), 10)
    if (!Number.isInteger(websiteId) || websiteId <= 0) return
    void recordWebsiteClick(websiteId)
}

/**
 * 格式化整数统计值，异常数据统一回退为 0。
 */
const formatIntegerCount = (value: unknown): string => {
    const parsed = Number.parseInt(String(value ?? 0), 10)
    if (!Number.isFinite(parsed) || parsed < 0) return '0'
    return parsed.toLocaleString('zh-CN')
}

/**
 * 格式化可选整数统计值，未录入数据不强行显示 0。
 */
const formatOptionalIntegerCount = (value: unknown): string => {
    if (value === null || value === undefined || value === '') return '-'
    const parsed = Number.parseInt(String(value), 10)
    if (!Number.isFinite(parsed) || parsed < 0) return '-'
    return parsed.toLocaleString('zh-CN')
}

/**
 * 格式化时间戳（秒/毫秒）为中文日期时间文本。
 */
const formatUnixDateTime = (value: unknown): string => {
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue) || numericValue <= 0) return '-'
    const milliseconds = numericValue > 9999999999 ? numericValue : numericValue * 1000
    const date = new Date(milliseconds)
    if (Number.isNaN(date.getTime())) return '-'
    return date.toLocaleString('zh-CN', { hour12: false })
}

/**
 * 格式化浮点数，空值回退为“-”。
 */
const formatFloatValue = (value: unknown, fractionDigits = 2): string => {
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) return '-'
    return numericValue.toFixed(fractionDigits)
}

/**
 * 格式化百分比值，支持数值或文本输入。
 */
const formatPercentValue = (value: unknown): string => {
    if (value === null || value === undefined || value === '') return '-'
    const text = String(value).trim()
    if (text.endsWith('%')) return text
    const numericValue = Number(text)
    if (!Number.isFinite(numericValue)) return '-'
    return `${numericValue}%`
}

/**
 * 格式化时长秒数（秒 -> 分钟+秒）。
 */
const formatDurationLabel = (seconds: unknown): string => {
    const numericValue = Number(seconds)
    if (!Number.isFinite(numericValue) || numericValue <= 0) return '-'
    const safeSeconds = Math.floor(numericValue)
    const minutes = Math.floor(safeSeconds / 60)
    const remainSeconds = safeSeconds % 60
    if (minutes <= 0) return `${remainSeconds} 秒`
    return `${minutes} 分 ${remainSeconds} 秒`
}

/**
 * 判断访问数据是否已录入，用于详情看板显示数据口径。
 */
const hasTrafficMetricData = (trafficMetrics: any): boolean => {
    if (!trafficMetrics || typeof trafficMetrics !== 'object') return false
    const sourceBreakdown = trafficMetrics.sourceBreakdown || {}
    const sourceTotal = Object.values(sourceBreakdown).reduce(
        (sum: number, value: any) => sum + (Number(value) > 0 ? Number(value) : 0),
        0
    )
    return [
        trafficMetrics.monthlyVisits,
        trafficMetrics.avgVisitDurationSeconds,
        trafficMetrics.pagesPerVisit,
        trafficMetrics.bounceRate
    ].some((value) => Number(value) > 0) || sourceTotal > 0 || Boolean(String(trafficMetrics.remark || '').trim())
}

/**
 * 输出访问数据来源标签文案，避免运营误认为所有指标都来自自动埋点。
 */
const getTrafficDataSourceLabel = (trafficMetrics: any): string => {
    if (!hasTrafficMetricData(trafficMetrics)) return '未录入'
    const source = String(trafficMetrics?.dataSource || 'manual').trim().toLowerCase()
    if (source === 'api') return '第三方估算'
    if (source === 'ops') return '运营标注'
    return '手动录入'
}

/**
 * 根据访问数据来源返回标签类型。
 */
const getTrafficDataSourceTagType = (trafficMetrics: any) => {
    if (!hasTrafficMetricData(trafficMetrics)) return 'info'
    const source = String(trafficMetrics?.dataSource || 'manual').trim().toLowerCase()
    if (source === 'api') return 'warning'
    if (source === 'ops') return 'success'
    return ''
}

/**
 * 从百分比字段提取数值，供进度条使用。
 */
const getTrafficSourcePercent = (value: unknown): number => {
    if (value === null || value === undefined || value === '') return 0
    const numericValue = Number(String(value).replace(/%/g, ''))
    if (!Number.isFinite(numericValue) || numericValue <= 0) return 0
    return Math.min(Math.max(Number(numericValue.toFixed(2)), 0), 100)
}

/**
 * 汇总详情抽屉 KPI 卡片数据，统一标注自动统计与手动录入口径。
 */
const getWebsiteDetailMetricCards = (website: any) => {
    const clickMetrics = website?.clickMetrics || {}
    const trafficMetrics = website?.trafficMetrics || {}
    const trafficSourceLabel = getTrafficDataSourceLabel(trafficMetrics)
    return [
        {
            key: 'total-clicks',
            label: '总点击量',
            value: formatIntegerCount(website?.clickCount),
            helper: '自动埋点累计',
            tone: 'blue'
        },
        {
            key: 'month-clicks',
            label: '本月点击',
            value: formatIntegerCount(clickMetrics.currentMonthClicks),
            helper: '按日点击表汇总',
            tone: 'green'
        },
        {
            key: 'recent-clicks',
            label: '近30日点击',
            value: formatIntegerCount(clickMetrics.recent30DayClicks),
            helper: '自动点击趋势',
            tone: 'orange'
        },
        {
            key: 'monthly-visits',
            label: '月访问量',
            value: formatOptionalIntegerCount(trafficMetrics.monthlyVisits),
            helper: `${trafficSourceLabel}数据`,
            tone: 'violet'
        },
        {
            key: 'duration',
            label: '平均访问时长',
            value: formatDurationLabel(trafficMetrics.avgVisitDurationSeconds),
            helper: `${trafficSourceLabel}数据`,
            tone: 'cyan'
        },
        {
            key: 'bounce-rate',
            label: '跳出率',
            value: formatPercentValue(trafficMetrics.bounceRate),
            helper: `${trafficSourceLabel}数据`,
            tone: 'red'
        }
    ]
}

const queryParams = reactive({
    keyword: '',
    categoryId: '',
    includeChildren: true,
    recycleBin: 0,
    statusList: [] as string[],
    flagList: [] as string[],
    sortBy: 'default',
    hasDetailContent: '',
    hasThumbnail: ''
})

/**
 * 批量导入结果行（用于明细表 + CSV 导出）
 */
interface BatchImportResultRow {
    status: string
    url: string
    websiteId?: number
    name?: string
    reason?: string
    message?: string
}

/**
 * 批量 AI 生成详情正文明细行
 */
interface BatchGenerateDetailResultRow {
    status: string
    websiteId?: number
    name?: string
    reason?: string
}

/**
 * 站点权重标签选项（与前端展示字段保持一致）。
 */
const WEBSITE_WEIGHT_TAG_OPTIONS = [
    { label: '官方', value: 'official' },
    { label: '推荐', value: 'recommended' },
    { label: '企业认证', value: 'enterprise_verified' }
]

const batchImportDialogVisible = ref(false)
const batchImportLoading = ref(false)
const batchImportResult = ref<{
    created: number
    skipped: number
    failed: number
    rows: BatchImportResultRow[]
} | null>(null)
const batchImportForm = reactive({
    categoryIds: [] as Array<string | number>,
    primaryCategoryId: '' as string | number,
    urlsText: '',
    allowDuplicate: true,
    fetchSeo: true,
    generateDetailContent: false,
    status: 'draft'
})
const batchGenerateDetailLoading = ref(false)
const batchGenerateDetailProgressVisible = ref(false)
const batchGenerateTargetCount = ref(0)
const batchGenerateDetailResultVisible = ref(false)
const batchGenerateDetailResult = ref<{
    total: number
    success: number
    skipped: number
    failed: number
    rows: BatchGenerateDetailResultRow[]
} | null>(null)
const batchWeightTagDialogVisible = ref(false)
const batchWeightTagLoading = ref(false)
const batchWeightTagForm = reactive({
    operation: 'add',
    weightTags: [] as string[]
})
const batchMoveDialogVisible = ref(false)
const batchMoveLoading = ref(false)
const batchMoveForm = reactive({
    applyCategory: true,
    categoryIds: [] as number[],
    applyTags: false,
    tagNames: [] as string[]
})
const recycleTypeFilter = ref<'all' | 'active' | 'draft' | 'disabled' | 'unchecked'>('all')
const websiteTagOptions = ref<Array<{ id: number; name: string }>>([])
const runningBatchTaskLeaveMessage = '当前有批量任务执行中，离开页面后可能无法及时看到结果，确定继续离开吗？'
const hasRunningBatchTask = computed(
    () =>
        batchImportLoading.value ||
        batchGenerateDetailLoading.value ||
        batchWeightTagLoading.value ||
        batchMoveLoading.value
)

/**
 * 列表请求参数归一化：多选字段统一转逗号串，后端可直接解析。
 */
const fetchWebsiteList = (params: any) => {
    const payload = { ...params }
    payload.recycleBin = Number(payload.recycleBin || 0)
    payload.statusList = Array.isArray(payload.statusList) ? payload.statusList.join(',') : ''
    payload.flagList = Array.isArray(payload.flagList) ? payload.flagList.join(',') : ''
    if (!payload.sortBy || payload.sortBy === 'default') delete payload.sortBy
    return uiedWebsiteList(payload)
}

const { pager, getLists, resetPage, resetParams } = usePaging({
    fetchFun: fetchWebsiteList,
    params: queryParams
})

/**
 * 当前是否处于回收站视图。
 */
const isRecycleBinMode = computed(() => Number(queryParams.recycleBin || 0) === 1)

/**
 * 网站列表快捷筛选键。
 */
type WebsiteQuickFilterKey = 'all' | 'published' | 'draft' | 'recycle'

/**
 * 应用网站快捷筛选（全部/已发布/草稿/回收站）。
 * @param key 快捷筛选键
 */
const applyWebsiteQuickFilter = (key: WebsiteQuickFilterKey) => {
    if (key === 'published') {
        queryParams.recycleBin = 0
        queryParams.statusList = ['active']
        recycleTypeFilter.value = 'all'
    } else if (key === 'draft') {
        queryParams.recycleBin = 0
        queryParams.statusList = ['draft']
        recycleTypeFilter.value = 'all'
    } else if (key === 'recycle') {
        queryParams.recycleBin = 1
        queryParams.statusList = []
        recycleTypeFilter.value = 'all'
    } else {
        queryParams.recycleBin = 0
        queryParams.statusList = []
        recycleTypeFilter.value = 'all'
    }
    resetPage()
}

/**
 * 判断网站快捷筛选按钮是否激活。
 * @param key 快捷筛选键
 */
const isWebsiteQuickFilterActive = (key: WebsiteQuickFilterKey) => {
    if (key === 'recycle') {
        return Number(queryParams.recycleBin || 0) === 1
    }
    if (Number(queryParams.recycleBin || 0) === 1) {
        return false
    }
    if (key === 'published') {
        return (
            Array.isArray(queryParams.statusList) &&
            queryParams.statusList.length === 1 &&
            queryParams.statusList[0] === 'active'
        )
    }
    if (key === 'draft') {
        return (
            Array.isArray(queryParams.statusList) &&
            queryParams.statusList.length === 1 &&
            queryParams.statusList[0] === 'draft'
        )
    }
    return Array.isArray(queryParams.statusList) && queryParams.statusList.length === 0
}

/**
 * 回收站类型筛选：仅在回收站视图下按状态过滤。
 * @param value 回收类型
 */
const handleRecycleTypeChange = (value: 'all' | 'active' | 'draft' | 'disabled' | 'unchecked') => {
    if (!isRecycleBinMode.value) return
    queryParams.statusList = value === 'all' ? [] : [value]
    resetPage()
}

/**
 * 统一格式化网站状态文案（兼容历史 normal 与新版 active）。
 */
const getWebsiteStatusLabel = (status: string) => {
    const normalized = String(status || '').trim().toLowerCase()
    if (normalized === 'active' || normalized === 'normal') return '已发布'
    if (normalized === 'disabled') return '已隐藏'
    if (normalized === 'draft') return '草稿'
    if (normalized === 'failed') return '异常'
    return '待审核'
}

/**
 * 根据状态返回标签风格，提升列表可读性。
 */
const getWebsiteStatusTagType = (status: string) => {
    const normalized = String(status || '').trim().toLowerCase()
    if (normalized === 'active' || normalized === 'normal') return 'success'
    if (normalized === 'disabled') return 'info'
    if (normalized === 'draft') return 'warning'
    if (normalized === 'failed') return 'danger'
    return ''
}

// 分类列表
const categoryList = ref<any[]>([])
const categoryOptions = computed(() => buildCategoryOptions(categoryList.value))
const batchImportCategorySearchKeyword = ref('')

/**
 * 统一归一化分类 ID 列表，保证多选值稳定为正整数数组。
 */
const normalizeCategoryIdSelection = (value: unknown): number[] =>
    Array.from(
        new Set(
            (Array.isArray(value) ? value : [])
                .map((item) => Number(item))
                .filter((item) => Number.isInteger(item) && item > 0)
        )
    )

/**
 * 末级分类集合：用于“仅选末级分类”快捷操作。
 */
const leafCategoryIdSet = computed(() => {
    const normalizedRows = Array.isArray(categoryList.value) ? categoryList.value : []
    const parentIds = new Set<number>()
    normalizedRows.forEach((item: any) => {
        const parentId = Number.parseInt(String(item?.parentId ?? 0), 10)
        if (Number.isInteger(parentId) && parentId > 0) parentIds.add(parentId)
    })
    const leafIds = new Set<number>()
    normalizedRows.forEach((item: any) => {
        const categoryId = Number.parseInt(String(item?.id || 0), 10)
        if (!Number.isInteger(categoryId) || categoryId <= 0) return
        if (!parentIds.has(categoryId)) leafIds.add(categoryId)
    })
    return leafIds
})

/**
 * 批量导入筛选后的可选分类数量。
 */
const batchImportSelectableCategoryCount = computed(() =>
    Array.isArray(batchImportCategoryOptions.value) ? batchImportCategoryOptions.value.length : 0
)

/**
 * 批量导入筛选后的可选末级分类数量。
 */
const batchImportSelectableLeafCategoryCount = computed(
    () =>
        (Array.isArray(batchImportCategoryOptions.value) ? batchImportCategoryOptions.value : []).filter((item: any) =>
            leafCategoryIdSet.value.has(Number(item?.id || 0))
        ).length
)

/**
 * 批量导入当前已选分类数量。
 */
const selectedBatchImportCategoryCount = computed(
    () => normalizeCategoryIdSelection(batchImportForm.categoryIds).length
)

/**
 * 批量导入快捷选择：支持“全选当前筛选 / 仅选末级分类”。
 */
const handleBatchImportSelectAllFiltered = (onlyLeaf: boolean) => {
    const candidates = (Array.isArray(batchImportCategoryOptions.value) ? batchImportCategoryOptions.value : [])
        .filter((item: any) => !onlyLeaf || leafCategoryIdSet.value.has(Number(item?.id || 0)))
        .map((item: any) => Number(item?.id || 0))
        .filter((item: number) => Number.isInteger(item) && item > 0)
    const normalized = Array.from(new Set(candidates))
    batchImportForm.categoryIds = normalized
    if (normalized.length === 0) {
        feedback.msgWarning(onlyLeaf ? '当前筛选结果没有末级分类可选' : '当前筛选结果没有可选分类')
        return
    }
    feedback.msgSuccess(onlyLeaf ? `已选择 ${normalized.length} 个末级分类` : `已选择 ${normalized.length} 个分类`)
}

/**
 * 清空批量导入已选分类（保留当前搜索关键词）。
 */
const handleBatchImportClearCategories = () => {
    batchImportForm.categoryIds = []
    batchImportForm.primaryCategoryId = ''
}

const categoryNameMap = computed(() => {
    const map = new Map<number, string>()
    categoryList.value.forEach((item: any) => {
        const categoryId = Number.parseInt(String(item?.id || 0), 10)
        if (!Number.isInteger(categoryId) || categoryId <= 0) return
        const categoryName = String(item?.name || '').trim()
        if (!categoryName) return
        map.set(categoryId, categoryName)
    })
    return map
})

/**
 * 规范化搜索关键词：统一小写并压缩空白，提升模糊匹配稳定性。
 */
const normalizeSearchKeyword = (value: unknown): string =>
    String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ')

/**
 * 构建带层级缩进的分类下拉选项，便于后台筛选父子分类
 */
const buildCategoryOptions = (categories: any[]) => {
    if (!Array.isArray(categories) || categories.length === 0) return []

    const parentMap = new Map<any, any[]>()
    const nodeMap = new Map<any, any>()
    const visited = new Set<any>()
    const options: any[] = []

    categories.forEach((item) => {
        nodeMap.set(item.id, item)
        const parentId = item.parentId ?? null
        if (!parentMap.has(parentId)) parentMap.set(parentId, [])
        parentMap.get(parentId)?.push(item)
    })

    /**
     * 递归构建分类路径（例如：设计 / 图标 / 免费），用于搜索和展示。
     */
    const pathCache = new Map<number, string>()
    const resolvePathLabel = (categoryId: number, depth = 0): string => {
        if (pathCache.has(categoryId)) return pathCache.get(categoryId) || ''
        const current = nodeMap.get(categoryId)
        if (!current) return ''
        if (depth > categories.length + 2) return String(current.name || '')
        const parentId = current.parentId ?? null
        const currentName = String(current.name || '')
        const pathLabel =
            parentId && nodeMap.has(parentId)
                ? `${resolvePathLabel(parentId, depth + 1)} / ${currentName}`
                : currentName
        pathCache.set(categoryId, pathLabel)
        return pathLabel
    }

    /**
     * 统一封装下拉项字段：补充路径文案与搜索关键字。
     */
    const createOptionItem = (item: any, level: number, hasParent: boolean) => {
        const indent = level > 0 ? `${'　'.repeat(level)}└ ` : hasParent ? '　└ ' : ''
        const name = String(item?.name || '').trim()
        const slug = String(item?.slug || '').trim()
        const pathLabel = resolvePathLabel(item.id)
        const pathLabelWithSlug = slug ? `${pathLabel}（slug: ${slug}）` : pathLabel
        const searchText = normalizeSearchKeyword(
            `${name} ${slug} ${pathLabel} ${pathLabelWithSlug} ${item?.id || ''}`
        )
        return {
            ...item,
            label: `${indent}${name}`,
            pathLabel,
            pathLabelWithSlug,
            searchText
        }
    }

    const walk = (parentId: any, level = 0) => {
        const children = parentMap.get(parentId) || []
        children.forEach((item) => {
            if (visited.has(item.id)) return
            visited.add(item.id)
            options.push(createOptionItem(item, level, false))
            walk(item.id, level + 1)
        })
    }

    walk(null, 0)
    walk(undefined, 0)

    // 兜底：异常 parentId 数据仍然可选，避免后台无法筛选
    categories.forEach((item) => {
        if (visited.has(item.id)) return
        const hasParent = item.parentId && nodeMap.has(item.parentId)
        options.push(createOptionItem(item, 0, Boolean(hasParent)))
    })

    return options
}

/**
 * 批量导入分类候选列表：支持按分类名/路径/slug 实时筛选。
 */
const batchImportCategoryOptions = computed(() => {
    const normalizedKeyword = normalizeSearchKeyword(batchImportCategorySearchKeyword.value)
    if (!normalizedKeyword) return categoryOptions.value
    return categoryOptions.value.filter((item: any) =>
        String(item?.searchText || '').includes(normalizedKeyword)
    )
})

/**
 * 记录批量导入分类搜索词，用于自定义过滤逻辑。
 */
const handleBatchImportCategoryFilter = (keyword: string) => {
    batchImportCategorySearchKeyword.value = String(keyword || '')
}

/**
 * 分类下拉关闭时清空搜索词，避免下次打开残留筛选状态。
 */
const handleBatchImportCategoryVisibleChange = (visible: boolean) => {
    if (visible) return
    batchImportCategorySearchKeyword.value = ''
}

/**
 * 解析站点权重标签列表，兼容字符串/数组输入。
 */
const normalizeWeightTags = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value.map((item) => String(item || '').trim()).filter(Boolean)
    }
    return String(value || '')
        .split(/[，,]/)
        .map((item) => String(item || '').trim())
        .filter(Boolean)
}

/**
 * 权重标签展示文案映射。
 */
const getWeightTagLabel = (value: string): string => {
    const normalized = String(value || '').trim().toLowerCase()
    if (normalized === 'official') return '官方'
    if (normalized === 'recommended') return '推荐'
    if (normalized === 'enterprise_verified') return '企业认证'
    return value || '-'
}

/**
 * 读取网站所属分类名称（支持多分类）。
 */
const getWebsiteCategoryNames = (row: any): string[] => {
    const categoryIds = Array.isArray(row?.categoryIds)
        ? row.categoryIds
              .map((item: unknown) => Number.parseInt(String(item || 0), 10))
              .filter((item: number) => Number.isInteger(item) && item > 0)
        : []
    const names = categoryIds
        .map((categoryId: number) => categoryNameMap.value.get(categoryId) || '')
        .filter(Boolean)
    if (names.length > 0) return Array.from(new Set(names))
    const fallbackName = String(row?.categoryName || '').trim()
    return fallbackName ? [ fallbackName ] : [ '未分类' ]
}

/**
 * 获取分类列表
 */
const getCategoryList = async () => {
    try {
        const res = await uiedCategoryAll()
        categoryList.value = res || []
    } catch (error) {
        console.error('获取分类列表失败:', error)
    }
}

/**
 * 获取网站标签列表（批量移动标签时使用）。
 */
const getWebsiteTagOptions = async () => {
    try {
        const res = await uiedWebsiteTagAll()
        websiteTagOptions.value = Array.isArray(res)
            ? res
                  .map((item: any) => ({
                      id: Number(item?.id || 0),
                      name: String(item?.name || '').trim()
                  }))
                  .filter((item: any) => item.id > 0 && item.name)
            : []
    } catch (error) {
        websiteTagOptions.value = []
    }
}

// 选中的ID
const selectedIds = ref<number[]>([])
const handleSelectionChange = (rows: any[]) => {
    selectedIds.value = rows.map((row) => row.id)
}

const websiteDetailDrawerVisible = ref(false)
const websiteDetailDrawerLoading = ref(false)
const websiteDetailData = ref<any | null>(null)

/**
 * 汇总站点详情分类文案，便于抽屉内集中展示。
 */
const getDetailCategoryText = (website: any): string => {
    const names = getWebsiteCategoryNames(website)
    return names.length > 0 ? names.join(' / ') : '未分类'
}

/**
 * 统计正文长度：用于快速判断站点详情内容完整度。
 */
const getDetailContentLengthLabel = (detailContent: unknown): string => {
    const plainTextLength = String(detailContent || '')
        .replace(/<[^>]+>/g, '')
        .replace(/\s+/g, '')
        .trim().length
    if (plainTextLength <= 0) return '无正文'
    return `${plainTextLength} 字`
}

/**
 * 规范化来源占比结构，统一输出可展示数组。
 */
const resolveTrafficSourceItems = (sourceBreakdown: any) => {
    const sourceMap = [
        { key: 'direct', label: '直接访问', color: '#2563eb' },
        { key: 'organicSearch', label: '自然搜索', color: '#16a34a' },
        { key: 'email', label: '邮件', color: '#0891b2' },
        { key: 'referral', label: '外链推荐', color: '#f97316' },
        { key: 'social', label: '社交媒体', color: '#7c3aed' },
        { key: 'displayAds', label: '广告投放', color: '#dc2626' },
        { key: 'others', label: '其他', color: '#64748b' }
    ]
    const sourceData = sourceBreakdown && typeof sourceBreakdown === 'object' ? sourceBreakdown : {}
    return sourceMap.map((item) => ({
        key: item.key,
        label: item.label,
        color: item.color,
        percent: getTrafficSourcePercent(sourceData?.[item.key]),
        value: formatPercentValue(sourceData?.[item.key])
    }))
}

/**
 * 打开网站详情侧边抽屉并拉取后端完整数据。
 */
const handleOpenDetailDrawer = async (row: any) => {
    websiteDetailDrawerVisible.value = true
    websiteDetailDrawerLoading.value = true
    websiteDetailData.value = null
    try {
        const detailRes = await uiedWebsiteDetail({ id: row.id })
        websiteDetailData.value = detailRes || row || null
    } catch (error: any) {
        feedback.msgError(error?.msg || error?.message || '获取网站详情失败')
        websiteDetailData.value = row || null
    } finally {
        websiteDetailDrawerLoading.value = false
    }
}

/**
 * 构建网站编辑页路由，并携带来源列表地址，便于保存后精准返回。
 */
const buildWebsiteEditRoute = (id?: number) => {
    const query: Record<string, string> = {
        from: String(route.fullPath || '/website-manage/website')
    }
    if (Number.isInteger(Number(id)) && Number(id) > 0) {
        query.id = String(id)
    }
    return {
        path: '/uied/website/edit',
        query
    }
}

// 跳转到编辑页面
const handleAdd = () => {
    router.push(buildWebsiteEditRoute())
}

/**
 * 打开批量导入弹窗并重置结果态
 */
const openBatchImportDialog = () => {
    batchImportDialogVisible.value = true
    batchImportResult.value = null
    batchImportForm.categoryIds = []
    batchImportForm.primaryCategoryId = ''
    batchImportForm.urlsText = ''
    batchImportForm.allowDuplicate = true
    batchImportForm.fetchSeo = true
    batchImportForm.generateDetailContent = false
    batchImportForm.status = 'draft'
}

/**
 * 批量导入弹窗关闭前校验：执行中禁止关闭，避免误操作中断感知。
 */
const handleBatchImportDialogBeforeClose = (done: () => void) => {
    if (batchImportLoading.value) {
        feedback.msgWarning('批量导入进行中，请等待任务完成后再关闭弹窗')
        return
    }
    done()
}

/**
 * 批量 AI 进度弹窗关闭前校验：执行中固定展示，不允许手动关闭。
 */
const handleBatchGenerateProgressBeforeClose = (done: () => void) => {
    if (batchGenerateDetailLoading.value) {
        feedback.msgWarning('批量 AI 生成进行中，请等待完成')
        return
    }
    done()
}

/**
 * 批量导入已选分类项（用于主分类切换下拉）。
 */
const selectedBatchImportCategoryOptions = computed(() => {
    const selectedSet = new Set(normalizeCategoryIdSelection(batchImportForm.categoryIds))
    return categoryOptions.value.filter((item) => selectedSet.has(Number(item.id)))
})

/**
 * 当多分类选择变化时，自动校正主分类字段，确保主分类始终在已选范围内。
 */
watch(
    () => [ ...(Array.isArray(batchImportForm.categoryIds) ? batchImportForm.categoryIds : []) ],
    (value) => {
        const normalized = normalizeCategoryIdSelection(value)
        if (normalized.length === 0) {
            batchImportForm.primaryCategoryId = ''
            return
        }
        const currentPrimary = Number(batchImportForm.primaryCategoryId || 0)
        if (Number.isInteger(currentPrimary) && currentPrimary > 0 && normalized.includes(currentPrimary)) {
            return
        }
        batchImportForm.primaryCategoryId = normalized[0]
    },
    { immediate: true }
)

/**
 * 规范化批量导入明细行，兼容后端不同返回结构。
 */
const normalizeBatchImportRows = (rows: any): BatchImportResultRow[] => {
    if (!Array.isArray(rows)) return []
    return rows.map((item: any) => ({
        status: String(item?.status || '').trim().toLowerCase(),
        url: String(item?.url || '').trim(),
        websiteId:
            Number.isFinite(Number(item?.websiteId)) && Number(item.websiteId) > 0
                ? Number(item.websiteId)
                : undefined,
        name: String(item?.name || '').trim(),
        reason: String(item?.reason || '').trim(),
        message: String(item?.message || '').trim()
    }))
}

/**
 * 批量导入状态文案
 */
const getBatchImportStatusLabel = (status: string) => {
    const normalized = String(status || '').trim().toLowerCase()
    if (normalized === 'created' || normalized === 'success') return '成功'
    if (normalized === 'skipped' || normalized === 'skip') return '跳过'
    if (normalized === 'failed' || normalized === 'error') return '失败'
    return '未知'
}

/**
 * 批量导入状态标签样式
 */
const getBatchImportStatusTagType = (status: string) => {
    const normalized = String(status || '').trim().toLowerCase()
    if (normalized === 'created' || normalized === 'success') return 'success'
    if (normalized === 'skipped' || normalized === 'skip') return 'warning'
    if (normalized === 'failed' || normalized === 'error') return 'danger'
    return 'info'
}

/**
 * 批量 AI 生成状态文案
 */
const getBatchGenerateStatusLabel = (status: string) => {
    const normalized = String(status || '').trim().toLowerCase()
    if (normalized === 'success' || normalized === 'created') return '成功'
    if (normalized === 'skipped' || normalized === 'skip') return '跳过'
    if (normalized === 'failed' || normalized === 'error') return '失败'
    return '未知'
}

/**
 * 批量 AI 生成状态标签样式
 */
const getBatchGenerateStatusTagType = (status: string) => {
    const normalized = String(status || '').trim().toLowerCase()
    if (normalized === 'success' || normalized === 'created') return 'success'
    if (normalized === 'skipped' || normalized === 'skip') return 'warning'
    if (normalized === 'failed' || normalized === 'error') return 'danger'
    return 'info'
}

/**
 * 导出批量导入明细 CSV，便于运营归档和复盘失败原因。
 */
const handleExportBatchImportCsv = () => {
    const rows = batchImportResult.value?.rows || []
    if (rows.length === 0) {
        feedback.msgWarning('暂无可导出的明细数据')
        return
    }
    const escapeCell = (value: unknown) => {
        const text = String(value ?? '').replace(/"/g, '""')
        return `"${text}"`
    }
    const header = ['序号', '状态', '网址', '网站ID', '网站名称', '原因/说明']
    const lines = rows.map((row, index) =>
        [
            index + 1,
            getBatchImportStatusLabel(row.status),
            row.url || '',
            row.websiteId || '',
            row.name || '',
            row.reason || row.message || ''
        ]
            .map(escapeCell)
            .join(',')
    )
    const csv = [header.map(escapeCell).join(','), ...lines].join('\n')
    const filename = `website_batch_import_${Date.now()}.csv`
    const blob = new Blob(['\ufeff', csv], { type: 'text/csv;charset=utf-8;' })
    const objectUrl = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(objectUrl)
    feedback.msgSuccess('CSV 导出成功')
}

/**
 * 提交批量导入任务
 */
const handleBatchImportSubmit = async () => {
    const normalizedCategoryIds = normalizeCategoryIdSelection(batchImportForm.categoryIds)
    const currentPrimary = Number(batchImportForm.primaryCategoryId || 0)
    const categoryId =
        Number.isInteger(currentPrimary) && currentPrimary > 0 && normalizedCategoryIds.includes(currentPrimary)
            ? currentPrimary
            : normalizedCategoryIds[0] || 0
    const urlsText = String(batchImportForm.urlsText || '').trim()
    if (normalizedCategoryIds.length === 0) {
        feedback.msgWarning('请至少选择一个分类')
        return
    }
    if (!urlsText) {
        feedback.msgWarning('请填写至少一个网址')
        return
    }
    batchImportLoading.value = true
    try {
        const result = await uiedWebsiteBatchImport({
            categoryId,
            categoryIds: normalizedCategoryIds,
            urls: urlsText,
            allowDuplicate: batchImportForm.allowDuplicate === true,
            fetchSeo: batchImportForm.fetchSeo,
            generateDetailContent: batchImportForm.generateDetailContent,
            status: batchImportForm.status
        })
        const resultData = result?.data?.data || result?.data || result || {}
        const normalizedRows = normalizeBatchImportRows(resultData?.rows || result?.rows)
        batchImportResult.value = {
            created: Number(resultData?.created || 0),
            skipped: Number(resultData?.skipped || 0),
            failed: Number(resultData?.failed || 0),
            rows: normalizedRows
        }
        feedback.msgSuccess(
            `导入完成：新增 ${batchImportResult.value.created} 条，跳过 ${batchImportResult.value.skipped} 条，失败 ${batchImportResult.value.failed} 条`
        )
        getLists()
    } catch (error: any) {
        feedback.msgError(error?.msg || error?.message || '批量导入失败')
    } finally {
        batchImportLoading.value = false
    }
}

/**
 * 批量 AI 生成网站详情正文（默认跳过已有正文）。
 */
const handleBatchGenerateDetailContent = async () => {
    if (!selectedIds.value.length) {
        feedback.msgWarning('请先选择要处理的网站')
        return
    }
    await feedback.confirm(
        `将为选中的 ${selectedIds.value.length} 个网站批量生成详情正文（已有正文默认跳过），是否继续？`
    )
    batchGenerateTargetCount.value = selectedIds.value.length
    batchGenerateDetailProgressVisible.value = true
    batchGenerateDetailLoading.value = true
    try {
        const result = await uiedWebsiteBatchGenerateDetailContent({
            ids: selectedIds.value,
            overwrite: false
        })
        const payload = result?.data?.data || result?.data || result || {}
        batchGenerateDetailResult.value = {
            total: Number(payload?.total || 0),
            success: Number(payload?.success || 0),
            skipped: Number(payload?.skipped || 0),
            failed: Number(payload?.failed || 0),
            rows: Array.isArray(payload?.rows)
                ? payload.rows.map((item: any) => ({
                      status: String(item?.status || ''),
                      websiteId: Number(item?.websiteId || 0) || undefined,
                      name: String(item?.name || ''),
                      reason: String(item?.reason || '')
                  }))
                : []
        }
        batchGenerateDetailResultVisible.value = true
        feedback.msgSuccess(
            `批量生成完成：成功 ${batchGenerateDetailResult.value.success}，跳过 ${batchGenerateDetailResult.value.skipped}，失败 ${batchGenerateDetailResult.value.failed}`
        )
        getLists()
    } catch (error: any) {
        feedback.msgError(error?.msg || error?.message || '批量 AI 生成失败')
    } finally {
        batchGenerateDetailLoading.value = false
        batchGenerateDetailProgressVisible.value = false
    }
}

/**
 * 打开批量权重标签弹窗，并重置默认值。
 */
const openBatchWeightTagDialog = () => {
    if (!selectedIds.value.length) {
        feedback.msgWarning('请先选择要处理的网站')
        return
    }
    batchWeightTagForm.operation = 'add'
    batchWeightTagForm.weightTags = [ 'official' ]
    batchWeightTagDialogVisible.value = true
}

/**
 * 提交批量权重标签处理任务。
 */
const handleBatchWeightTagSubmit = async () => {
    if (!selectedIds.value.length) {
        feedback.msgWarning('请先选择要处理的网站')
        return
    }
    if (
        batchWeightTagForm.operation !== 'clear' &&
        (!Array.isArray(batchWeightTagForm.weightTags) || batchWeightTagForm.weightTags.length === 0)
    ) {
        feedback.msgWarning('请至少选择一个权重标签')
        return
    }
    await feedback.confirm(
        `将对 ${selectedIds.value.length} 个网站执行「${batchWeightTagForm.operation}」操作，是否继续？`
    )
    batchWeightTagLoading.value = true
    try {
        const result = await uiedWebsiteBatchWeightTags({
            ids: selectedIds.value,
            operation: batchWeightTagForm.operation,
            weightTags:
                batchWeightTagForm.operation === 'clear'
                    ? []
                    : batchWeightTagForm.weightTags
        })
        const payload = result?.data?.data || result?.data || result || {}
        const updated = Number(payload?.updated || 0)
        const skipped = Number(payload?.skipped || 0)
        feedback.msgSuccess(`处理完成：更新 ${updated} 条，跳过 ${skipped} 条`)
        batchWeightTagDialogVisible.value = false
        getLists()
    } catch (error: any) {
        feedback.msgError(error?.msg || error?.message || '批量处理权重标签失败')
    } finally {
        batchWeightTagLoading.value = false
    }
}

/**
 * 打开批量移动弹窗，并按需加载标签候选。
 */
const openBatchMoveDialog = async () => {
    if (!selectedIds.value.length) {
        feedback.msgWarning('请先选择要处理的网站')
        return
    }
    batchMoveForm.applyCategory = true
    batchMoveForm.categoryIds = []
    batchMoveForm.applyTags = false
    batchMoveForm.tagNames = []
    batchMoveDialogVisible.value = true
    if (!websiteTagOptions.value.length) {
        await getWebsiteTagOptions()
    }
}

/**
 * 提交网站批量移动（分类 + 普通标签）。
 */
const handleBatchMoveSubmit = async () => {
    if (!selectedIds.value.length) {
        feedback.msgWarning('请先选择要处理的网站')
        return
    }
    if (!batchMoveForm.applyCategory && !batchMoveForm.applyTags) {
        feedback.msgWarning('请至少开启一个批量项（分类或标签）')
        return
    }
    const normalizedCategoryIds = normalizeCategoryIdSelection(batchMoveForm.categoryIds)
    if (batchMoveForm.applyCategory && normalizedCategoryIds.length === 0) {
        feedback.msgWarning('请选择目标分类')
        return
    }
    batchMoveLoading.value = true
    try {
        const result = await uiedWebsiteBatchMove({
            ids: selectedIds.value,
            applyCategory: batchMoveForm.applyCategory,
            categoryId: normalizedCategoryIds[0] || 0,
            categoryIds: normalizedCategoryIds,
            applyTags: batchMoveForm.applyTags,
            tags: batchMoveForm.applyTags ? batchMoveForm.tagNames : undefined
        })
        const payload = result?.data?.data || result?.data || result || {}
        const updated = Number(payload?.updated || selectedIds.value.length)
        feedback.msgSuccess(`批量移动完成：已处理 ${updated} 个网站`)
        batchMoveDialogVisible.value = false
        selectedIds.value = []
        getLists()
    } catch (error: any) {
        feedback.msgError(error?.msg || error?.message || '批量移动失败')
    } finally {
        batchMoveLoading.value = false
    }
}

/**
 * 一键清空网站回收站（按当前筛选条件执行）。
 */
const handleClearRecycle = async () => {
    if (!isRecycleBinMode.value) return
    await feedback.confirm(
        `确认彻底删除当前筛选条件下的回收站网站吗？预计共 ${Number(pager.count || 0)} 条，此操作不可恢复。`
    )
    try {
        const result = await uiedWebsiteRecycleClear({
            keyword: queryParams.keyword,
            categoryId: queryParams.categoryId,
            includeChildren: queryParams.includeChildren ? 1 : 0,
            statusList: Array.isArray(queryParams.statusList) ? queryParams.statusList : []
        })
        const payload = result?.data?.data || result?.data || result || {}
        const deleted = Number(payload?.deleted || 0)
        feedback.msgSuccess(`清空完成：已删除 ${deleted} 个网站`)
        selectedIds.value = []
        getLists()
    } catch (error: any) {
        feedback.msgError(error?.msg || error?.message || '清空回收站失败')
    }
}

/**
 * 页面关闭前拦截：批量任务进行中时给出浏览器原生二次确认。
 */
const handleBeforeUnload = (event: BeforeUnloadEvent) => {
    if (!hasRunningBatchTask.value) return
    event.preventDefault()
    event.returnValue = runningBatchTaskLeaveMessage
}

const handleEdit = (row: any) => {
    router.push(buildWebsiteEditRoute(Number(row?.id || 0)))
}

const handleDelete = async (id: number) => {
    await feedback.confirm('确定将该网站移入回收站吗？')
    await uiedWebsiteDelete({ id })
    feedback.msgSuccess('已移入回收站')
    getLists()
}

const handleBatchDelete = async () => {
    await feedback.confirm(`确定将选中的 ${selectedIds.value.length} 个网站移入回收站吗？`)
    await uiedWebsiteBatchDelete({ ids: selectedIds.value })
    feedback.msgSuccess('已移入回收站')
    selectedIds.value = []
    getLists()
}

/**
 * 恢复单个回收站网站。
 * @param id 网站ID
 */
const handleRestore = async (id: number) => {
    await feedback.confirm('确定恢复该网站吗？')
    await uiedWebsiteRestore({ id })
    feedback.msgSuccess('恢复成功')
    getLists()
}

/**
 * 回收站彻底删除单个网站（不可恢复）。
 * @param id 网站ID
 */
const handleRealDelete = async (id: number) => {
    await feedback.confirm('确定彻底删除该网站吗？该操作不可恢复。')
    await uiedWebsiteRealDelete({ id })
    feedback.msgSuccess('彻底删除成功')
    getLists()
}

/**
 * 批量恢复回收站网站。
 */
const handleBatchRestore = async () => {
    await feedback.confirm(`确定恢复选中的 ${selectedIds.value.length} 个网站吗？`)
    await uiedWebsiteBatchRestore({ ids: selectedIds.value })
    feedback.msgSuccess('批量恢复成功')
    selectedIds.value = []
    getLists()
}

/**
 * 批量彻底删除回收站网站（不可恢复）。
 */
const handleBatchRealDelete = async () => {
    await feedback.confirm(`确定彻底删除选中的 ${selectedIds.value.length} 个网站吗？该操作不可恢复。`)
    await uiedWebsiteBatchRealDelete({ ids: selectedIds.value })
    feedback.msgSuccess('批量彻底删除成功')
    selectedIds.value = []
    getLists()
}

/**
 * 监听编辑页返回的刷新标记，自动刷新列表数据。
 */
watch(
    () => route.query.refresh,
    (refreshToken, previousToken) => {
        if (!refreshToken || refreshToken === previousToken) return
        getLists()
    }
)

/**
 * 路由离开守卫：批量任务执行中时提醒用户，避免误切页。
 */
onBeforeRouteLeave(async () => {
    if (!hasRunningBatchTask.value) return true
    try {
        await feedback.confirm(runningBatchTaskLeaveMessage)
        return true
    } catch (error) {
        return false
    }
})

onMounted(() => {
    getCategoryList()
    getWebsiteTagOptions()
    window.addEventListener('beforeunload', handleBeforeUnload)
})

/**
 * keep-alive 场景下页面重新激活时主动刷新一次，规避“返回列表空白需手动刷新”问题。
 */
onActivated(() => {
    getLists()
})

onUnmounted(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload)
})

getLists()
</script>

<style scoped>
.website-quick-filters__label--type {
    margin-left: 8px;
}

.website-quick-filters__type-select {
    width: 170px;
}

:deep(.website-detail-drawer .el-drawer__body) {
    padding: 0;
    background:
        radial-gradient(circle at 12% 0%, rgba(37, 99, 235, 0.12), transparent 32%),
        linear-gradient(180deg, #f8fafc 0%, #eef3f8 100%);
}

.website-detail-panel {
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 22px;
}

.website-detail-hero {
    position: relative;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
    overflow: hidden;
    padding: 24px;
    border-radius: 24px;
    color: #ffffff;
    background:
        radial-gradient(circle at 85% 12%, rgba(255, 255, 255, 0.28), transparent 30%),
        linear-gradient(135deg, #0f172a 0%, #1e3a8a 54%, #0369a1 100%);
    box-shadow: 0 18px 42px rgba(15, 23, 42, 0.18);
}

.website-detail-hero::after {
    position: absolute;
    right: -64px;
    bottom: -86px;
    width: 220px;
    height: 220px;
    content: '';
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.16);
}

.website-detail-hero__content,
.website-detail-hero__actions {
    position: relative;
    z-index: 1;
}

.website-detail-hero__eyebrow {
    margin-bottom: 8px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.16em;
    color: rgba(255, 255, 255, 0.72);
}

.website-detail-hero__title {
    margin: 0;
    font-size: 28px;
    font-weight: 800;
    line-height: 1.25;
}

.website-detail-hero__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    margin-top: 16px;
    color: rgba(255, 255, 255, 0.82);
}

.website-detail-hero__meta span {
    padding: 5px 10px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.1);
}

.website-detail-hero__actions {
    display: flex;
    gap: 10px;
    white-space: nowrap;
}

.website-detail-link-card {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 210px;
    gap: 14px;
    padding: 16px;
    border: 1px solid rgba(148, 163, 184, 0.22);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.86);
    box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
}

.website-detail-link-card__item,
.website-detail-link-card__time {
    min-width: 0;
}

.website-detail-link-card__item span {
    display: block;
    margin-bottom: 6px;
    font-size: 12px;
    color: #64748b;
}

.website-detail-link-card__item a {
    display: block;
    overflow: hidden;
    font-weight: 700;
    color: #1d4ed8;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.website-detail-link-card__time {
    padding-left: 14px;
    font-size: 12px;
    line-height: 1.8;
    color: #64748b;
    border-left: 1px solid #e2e8f0;
}

.website-detail-section {
    padding: 18px;
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
}

.website-detail-section__head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 16px;
}

.website-detail-section__head h3,
.website-seo-card h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 800;
    color: #0f172a;
}

.website-detail-section__head p {
    margin: 6px 0 0;
    font-size: 13px;
    color: #64748b;
}

.website-metric-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
}

.website-metric-card {
    position: relative;
    overflow: hidden;
    min-height: 124px;
    padding: 16px;
    border: 1px solid #e2e8f0;
    border-radius: 18px;
    background: #f8fafc;
}

.website-metric-card::after {
    position: absolute;
    right: -28px;
    bottom: -30px;
    width: 92px;
    height: 92px;
    content: '';
    border-radius: 999px;
    background: currentColor;
    opacity: 0.1;
}

.website-metric-card__label {
    display: block;
    font-size: 13px;
    color: #64748b;
}

.website-metric-card strong {
    display: block;
    margin-top: 10px;
    font-size: 28px;
    font-weight: 850;
    line-height: 1.1;
    color: #0f172a;
}

.website-metric-card small {
    display: block;
    margin-top: 10px;
    font-size: 12px;
    color: #64748b;
}

.website-metric-card--blue {
    color: #2563eb;
}

.website-metric-card--green {
    color: #16a34a;
}

.website-metric-card--orange {
    color: #f97316;
}

.website-metric-card--violet {
    color: #7c3aed;
}

.website-metric-card--cyan {
    color: #0891b2;
}

.website-metric-card--red {
    color: #dc2626;
}

.website-source-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px 20px;
}

.website-source-list__label {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 6px;
    font-size: 13px;
    color: #475569;
}

.website-source-list__label strong {
    color: #0f172a;
}

.website-detail-section--two {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
}

.website-seo-card {
    min-width: 0;
    padding: 16px;
    border-radius: 18px;
    background: #f8fafc;
}

.website-seo-card dl {
    margin: 14px 0 0;
}

.website-seo-card dt {
    margin-top: 12px;
    font-size: 12px;
    color: #64748b;
}

.website-seo-card dd {
    margin: 4px 0 0;
    overflow-wrap: anywhere;
    color: #0f172a;
}

@media (max-width: 900px) {
    .website-detail-hero,
    .website-detail-section__head {
        flex-direction: column;
    }

    .website-detail-link-card,
    .website-metric-grid,
    .website-source-list,
    .website-detail-section--two {
        grid-template-columns: 1fr;
    }

    .website-detail-link-card__time {
        padding-top: 12px;
        padding-left: 0;
        border-top: 1px solid #e2e8f0;
        border-left: 0;
    }
}
</style>
