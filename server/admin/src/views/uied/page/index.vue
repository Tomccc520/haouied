<!--
 * @file views/uied/page/index.vue
 * @description UIED 页面管理
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
-->
<template>
    <div class="page-lists">
        <el-card class="!border-none" shadow="never">
            <el-form :inline="true" :model="queryParams" class="mb-4">
                <el-form-item label="关键词">
                    <el-input
                        v-model="queryParams.keyword"
                        clearable
                        placeholder="页面名称/别名/Hero 标题"
                        class="input-w-260"
                        @keyup.enter="handleSearch"
                    />
                </el-form-item>
                <el-form-item label="状态">
                    <el-select
                        v-model="queryParams.isActive"
                        clearable
                        placeholder="全部状态"
                        class="input-w-140"
                    >
                        <el-option label="显示" value="1" />
                        <el-option label="隐藏" value="0" />
                    </el-select>
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="handleSearch">查询</el-button>
                    <el-button @click="handleResetSearch">重置</el-button>
                </el-form-item>
            </el-form>
            <div class="mb-4 flex justify-between">
                <div class="flex items-center gap-2">
                    <el-button type="primary" @click="handleAdd">
                        <template #icon><icon name="el-icon-Plus" /></template>
                        添加页面
                    </el-button>
                    <el-button @click="openWpTaxonomyDialog">
                        <template #icon><icon name="el-icon-SetUp" /></template>
                        WordPress 分类/标签配置
                    </el-button>
                </div>
                <div class="text-gray-400">共 {{ pager.count }} 个页面</div>
            </div>
            <el-table size="large" v-loading="pager.loading" :data="pager.lists">
                <el-table-column label="ID" prop="id" width="80" />
                <el-table-column label="页面名称" prop="name" min-width="120" />
                <el-table-column label="别名" prop="slug" min-width="100" />
                <el-table-column
                    label="Hero标题"
                    prop="heroTitle"
                    min-width="150"
                    show-overflow-tooltip
                />
                <el-table-column label="显示模式" width="100">
                    <template #default="{ row }">
                        <el-tag
                            size="small"
                            :type="row.heroDisplayMode === 'iconScroll' ? 'warning' : ''"
                        >
                            {{ row.heroDisplayMode === 'iconScroll' ? '图标滚动' : '搜索框' }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="排序" width="140">
                    <template #default="{ row }">
                        <div class="page-sort-cell">
                            <el-input-number
                                v-model="rowSortMap[row.id]"
                                :min="0"
                                :controls="false"
                                size="small"
                                class="input-w-80"
                                @change="() => handleQuickSortSave(row)"
                            />
                            <el-button
                                type="primary"
                                link
                                :loading="Boolean(rowSortSavingMap[row.id])"
                                @click="handleQuickSortSave(row)"
                            >
                                保存
                            </el-button>
                        </div>
                    </template>
                </el-table-column>
                <el-table-column label="状态" width="80">
                    <template #default="{ row }">
                        <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
                            {{ row.isActive ? '显示' : '隐藏' }}
                        </el-tag>
                    </template>
                </el-table-column>
                <el-table-column label="操作" width="260" fixed="right">
                    <template #default="{ row }">
                        <el-button type="primary" link @click="handleCategories(row)"
                            >分类配置</el-button
                        >
                        <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
                        <el-button type="primary" link @click="handleEdit(row, 'config')">
                            设计文章配置
                        </el-button>
                        <el-button type="danger" link @click="handleDelete(row.id)">删除</el-button>
                    </template>
                </el-table-column>
            </el-table>
            <div class="flex justify-end mt-4">
                <pagination v-model="pager" @change="getLists" />
            </div>
        </el-card>

        <!-- 编辑弹窗 -->
        <el-dialog
            v-model="showEdit"
            :title="editData.id ? '编辑页面' : '添加页面'"
            width="700px"
            top="5vh"
        >
            <el-form ref="editFormRef" :model="editData" :rules="editRules" label-width="110px">
                <el-tabs v-model="editTab">
                    <!-- 基本信息 -->
                    <el-tab-pane label="基本信息" name="basic">
                        <el-form-item label="页面名称" prop="name">
                            <el-input v-model="editData.name" placeholder="请输入页面名称" />
                        </el-form-item>
                        <el-form-item label="页面别名" prop="slug">
                            <el-input
                                v-model="editData.slug"
                                placeholder="请输入页面别名（URL友好）"
                                @input="handleSlugInput"
                            />
                            <div class="text-gray-400 text-xs mt-1">
                                前台路径预览：<code>/p/{{ editData.slug || 'your-page-slug' }}</code>
                            </div>
                        </el-form-item>
                        <el-form-item label="页面描述">
                            <el-input v-model="editData.description" type="textarea" :rows="2" />
                        </el-form-item>
                        <el-form-item label="排序">
                            <el-input-number v-model="editData.sortOrder" :min="0" />
                        </el-form-item>
                        <el-form-item label="状态">
                            <el-switch v-model="editData.isActive" />
                        </el-form-item>
                    </el-tab-pane>

                    <!-- Hero 横幅配置 -->
                    <el-tab-pane label="Hero横幅" name="hero">
                        <el-form-item label="Hero标题">
                            <el-input v-model="editData.heroTitle" placeholder="首屏大标题" />
                        </el-form-item>
                        <el-form-item label="高亮文本">
                            <el-input
                                v-model="editData.heroHighlightText"
                                placeholder="标题中需要高亮的文本，如: AI工具"
                            />
                            <div class="text-gray-400 text-xs mt-1">标题中需要高亮显示的文本</div>
                        </el-form-item>
                        <el-form-item label="Hero副标题">
                            <el-input
                                v-model="editData.heroSubtitle"
                                type="textarea"
                                :rows="2"
                                placeholder="首屏副标题"
                            />
                        </el-form-item>
                        <el-form-item label="热门搜索标签">
                            <el-input
                                v-model="editData.hotSearchTagsStr"
                                type="textarea"
                                :rows="2"
                                placeholder="标签1,标签2,标签3"
                            />
                            <div class="text-gray-400 text-xs mt-1">
                                支持两种模式：填写则使用自定义标签；留空则前台按后台网站标签热度自动生成。
                            </div>
                        </el-form-item>
                        <el-form-item label="背景类型">
                            <el-select v-model="editData.heroBgType" class="w-100">
                                <el-option label="默认背景图" value="default" />
                                <el-option label="纯色背景" value="color" />
                                <el-option label="渐变背景" value="gradient" />
                                <el-option label="自定义图片" value="image" />
                            </el-select>
                        </el-form-item>
                        <el-form-item label="背景值" v-if="editData.heroBgType !== 'default'">
                            <el-input
                                v-model="editData.heroBgValue"
                                :placeholder="getBgPlaceholder()"
                            />
                            <div class="text-gray-400 text-xs mt-1">{{ getBgHint() }}</div>
                        </el-form-item>
                        <el-form-item label="显示模式">
                            <el-select v-model="editData.heroDisplayMode" class="w-100">
                                <el-option label="搜索框模式" value="search" />
                                <el-option label="图标滚动墙" value="iconScroll" />
                            </el-select>
                            <div class="text-gray-400 text-xs mt-1">
                                图标滚动墙会在背景显示网站图标滚动效果
                            </div>
                        </el-form-item>

                        <!-- 图标滚动墙分类选择 -->
                        <el-form-item
                            label="滚动图标分类"
                            v-if="editData.heroDisplayMode === 'iconScroll'"
                        >
                            <div class="scroll-categories-selector">
                                <!-- 多选分类 -->
                                <el-select
                                    v-model="selectedScrollCategoryIds"
                                    placeholder="选择要显示图标的分类"
                                    class="w-100"
                                    multiple
                                    filterable
                                    clearable
                                >
                                    <el-option
                                        v-for="cat in scrollCategories"
                                        :key="cat.id"
                                        :label="cat.name"
                                        :value="cat.id"
                                    />
                                </el-select>
                                <div class="text-gray-400 text-xs mt-2">
                                    选择分类后，该分类下的网站图标将在 Hero 区域滚动显示
                                </div>
                                <div
                                    v-if="loadingScrollWebsites"
                                    class="text-blue-500 text-xs mt-1"
                                >
                                    正在加载分类下的网站...
                                </div>
                                <div
                                    v-else-if="selectedScrollWebsites.length > 0"
                                    class="text-green-500 text-xs mt-1"
                                >
                                    已匹配 {{ selectedScrollWebsites.length }} 个网站图标
                                </div>
                            </div>
                        </el-form-item>
                    </el-tab-pane>

                    <!-- 页面配置 -->
                    <el-tab-pane label="页面配置" name="config">
                        <el-form-item label="搜索占位符">
                            <el-input
                                v-model="editData.searchPlaceholder"
                                placeholder="搜索框占位文本"
                            />
                        </el-form-item>
                        <el-form-item label="启用搜索">
                            <el-switch v-model="editData.searchEnabled" />
                        </el-form-item>
                        <el-form-item label="显示热门推荐">
                            <el-switch v-model="editData.showHotRecommendations" />
                        </el-form-item>
                        <el-form-item label="显示分类">
                            <el-switch v-model="editData.showCategories" />
                        </el-form-item>
                        <el-form-item label="显示侧边栏">
                            <el-switch v-model="editData.showSidebar" />
                        </el-form-item>
                        <el-divider content-position="left">设计文章 API 配置</el-divider>
                        <el-form-item label="启用文章模块">
                            <el-switch v-model="editData.designArticleEnabled" />
                        </el-form-item>
                        <el-form-item label="模块标题">
                            <el-input
                                v-model="editData.designArticleTitle"
                                :disabled="!editData.designArticleEnabled"
                                placeholder="例如：设计文章"
                            />
                        </el-form-item>
                        <el-form-item label="展示数量">
                            <el-input-number
                                v-model="editData.designArticleLimit"
                                :min="1"
                                :max="50"
                                :disabled="!editData.designArticleEnabled"
                            />
                        </el-form-item>
                        <el-form-item label="筛选源数据">
                            <el-button
                                :loading="designArticleFilterLoading"
                                :disabled="!editData.designArticleEnabled"
                                @click="loadDesignArticleFilterOptions"
                            >
                                刷新分类/标签库
                            </el-button>
                            <span class="ml-2 text-xs text-gray-400">
                                分类 {{ wordpressCategoryOptions.length }} 项，标签 {{ wordpressTagOptions.length }} 项
                            </span>
                        </el-form-item>
                        <el-form-item label="文章分类（下拉）">
                            <el-select
                                v-model="designArticleCategoryIdsModel"
                                multiple
                                filterable
                                clearable
                                collapse-tags
                                collapse-tags-tooltip
                                :disabled="!editData.designArticleEnabled"
                                :loading="designArticleFilterLoading"
                                class="w-100"
                                placeholder="请选择文章分类（可多选）"
                            >
                                <el-option
                                    v-for="item in wordpressCategoryOptions"
                                    :key="item.id"
                                    :label="item.label"
                                    :value="item.id"
                                />
                            </el-select>
                        </el-form-item>
                        <el-form-item label="文章标签（下拉）">
                            <el-select
                                v-model="designArticleTagIdsModel"
                                multiple
                                filterable
                                clearable
                                collapse-tags
                                collapse-tags-tooltip
                                :disabled="!editData.designArticleEnabled"
                                :loading="designArticleFilterLoading"
                                class="w-100"
                                placeholder="请选择文章标签（可多选）"
                            >
                                <el-option
                                    v-for="item in wordpressTagOptions"
                                    :key="item.id"
                                    :label="item.label"
                                    :value="item.id"
                                />
                            </el-select>
                            <div class="text-gray-400 text-xs mt-1">
                                选中后会自动写入组件配置，无需手工维护 ID 文本。
                            </div>
                        </el-form-item>
                        <el-form-item label="展示方式">
                            <el-radio-group
                                v-model="editData.designArticleDisplayMode"
                                :disabled="!editData.designArticleEnabled"
                            >
                                <el-radio-button label="fixed">固定显示</el-radio-button>
                                <el-radio-button label="tabs">分类切换</el-radio-button>
                            </el-radio-group>
                            <div class="text-gray-400 text-xs mt-1">
                                固定显示：前端仅展示一个分类/标签；分类切换：前端展示可切换标签。
                            </div>
                        </el-form-item>
                        <el-form-item
                            v-if="editData.designArticleDisplayMode === 'fixed'"
                            label="固定来源"
                        >
                            <el-radio-group
                                v-model="editData.designArticleFixedType"
                                :disabled="!editData.designArticleEnabled"
                            >
                                <el-radio-button label="category">分类</el-radio-button>
                                <el-radio-button label="tag">标签</el-radio-button>
                            </el-radio-group>
                        </el-form-item>
                        <el-form-item
                            v-if="editData.designArticleDisplayMode === 'fixed'"
                            label="固定项"
                        >
                            <el-select
                                v-model="editData.designArticleFixedId"
                                filterable
                                clearable
                                :disabled="
                                    !editData.designArticleEnabled ||
                                    designArticleFixedOptions.length === 0
                                "
                                class="w-100"
                                placeholder="请选择固定展示的分类或标签"
                            >
                                <el-option
                                    v-for="item in designArticleFixedOptions"
                                    :key="`${item.type}-${item.id}`"
                                    :label="item.label"
                                    :value="item.id"
                                />
                            </el-select>
                            <div class="text-gray-400 text-xs mt-1">
                                仅展示当前固定项；请先在上方分类/标签里选择来源数据。
                            </div>
                        </el-form-item>
                        <el-form-item label="更多链接">
                            <el-input
                                v-model="editData.designArticleShowMoreLink"
                                :disabled="!editData.designArticleEnabled"
                                placeholder="/article 或 https://www.uied.cn/article"
                            />
                            <div class="text-gray-400 text-xs mt-1">
                                用于前端设计文章模块“查看更多”按钮；留空则走前端默认值。
                            </div>
                        </el-form-item>
                        <el-form-item label="主题色">
                            <el-color-picker v-model="editData.themeColor" />
                            <span class="ml-2 text-gray-400">{{
                                editData.themeColor || '未设置'
                            }}</span>
                        </el-form-item>
                    </el-tab-pane>
                </el-tabs>
            </el-form>
            <template #footer>
                <el-button @click="showEdit = false">取消</el-button>
                <el-button type="primary" :loading="editLoading" @click="handleSubmit"
                    >确定</el-button
                >
            </template>
        </el-dialog>

        <!-- 分类配置弹窗 -->
        <el-dialog v-model="showCategories" title="页面分类配置" width="920px">
            <div class="page-category-config">
                <div class="page-category-config__panel">
                    <div class="page-category-config__panel-title">分类树（支持搜索）</div>
                    <el-input
                        v-model="categoryKeyword"
                        clearable
                        placeholder="输入分类名称搜索"
                        @input="handleCategoryKeywordChange"
                    />
                    <div class="page-category-config__tree">
                        <el-tree
                            ref="categoryTreeRef"
                            node-key="id"
                            show-checkbox
                            check-strictly
                            :data="categoryTreeData"
                            :props="{ label: 'pathLabel', children: 'children' }"
                            :filter-node-method="filterCategoryNode"
                            @check="handleCategoryTreeCheck"
                        />
                    </div>
                </div>
                <div class="page-category-config__panel">
                    <div class="page-category-config__panel-title page-category-config__panel-title--with-action">
                        <span>已选分类（可排序）</span>
                        <el-button
                            v-if="categorySelectedRows.length > 0"
                            type="danger"
                            link
                            @click="clearSelectedCategories"
                        >
                            清空
                        </el-button>
                    </div>
                    <div v-if="categorySelectedRows.length === 0" class="page-category-config__empty">
                        请在左侧勾选要展示的分类（建议按业务顺序排列）。
                    </div>
                    <div v-else class="page-category-config__selected-list">
                        <div
                            v-for="(item, index) in categorySelectedRows"
                            :key="item.id"
                            class="page-category-config__selected-item"
                        >
                            <div class="page-category-config__selected-main">
                                <span class="page-category-config__selected-index">{{ index + 1 }}</span>
                                <div class="page-category-config__selected-icon-wrap">
                                    <span
                                        v-if="resolveSvgIconMarkup(item.icon)"
                                        class="page-category-config__selected-icon page-category-config__selected-icon--svg"
                                        v-html="resolveSvgIconMarkup(item.icon)"
                                    />
                                    <icon
                                        v-else-if="item.icon"
                                        :name="item.icon"
                                        class="page-category-config__selected-icon"
                                    />
                                    <span v-else class="page-category-config__selected-icon-empty">无图标</span>
                                </div>
                                <span class="page-category-config__selected-name">{{ item.pathLabel }}</span>
                            </div>
                            <div class="page-category-config__selected-icon-editor">
                                <el-radio-group
                                    :model-value="getCategoryIconMode(item)"
                                    size="small"
                                    class="page-category-config__selected-icon-mode"
                                    @change="
                                        (mode) =>
                                            handleCategoryIconModeChange(item, mode)
                                    "
                                >
                                    <el-radio-button label="svg">SVG图标库</el-radio-button>
                                    <el-radio-button label="icon">系统图标（Element Plus / local-icon）</el-radio-button>
                                </el-radio-group>
                                <svg-library-picker
                                    v-if="getCategoryIconMode(item) === 'svg'"
                                    v-model="item.icon"
                                    :options="categorySvgLibraryOptions"
                                    class="page-category-config__selected-svg-picker"
                                />
                                <icon-picker
                                    v-else
                                    v-model="item.icon"
                                    class="page-category-config__selected-icon-picker"
                                />
                                <div class="page-category-config__selected-icon-tip">
                                    {{
                                        getCategoryIconMode(item) === 'svg'
                                            ? '推荐：使用图标库统一视觉（svg:key）'
                                            : '可在弹层顶部切换 Element Plus / local-icon 图标源'
                                    }}
                                </div>
                            </div>
                            <div class="page-category-config__selected-actions">
                                <el-button
                                    type="primary"
                                    link
                                    :disabled="index === 0"
                                    @click="moveSelectedCategory(index, -1)"
                                >
                                    上移
                                </el-button>
                                <el-button
                                    type="primary"
                                    link
                                    :disabled="index === categorySelectedRows.length - 1"
                                    @click="moveSelectedCategory(index, 1)"
                                >
                                    下移
                                </el-button>
                                <el-button type="danger" link @click="removeSelectedCategory(item.id)">
                                    移除
                                </el-button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <template #footer>
                <el-button @click="showCategories = false">取消</el-button>
                <el-button type="primary" :loading="categoryLoading" @click="handleSaveCategories"
                    >保存</el-button
                >
            </template>
        </el-dialog>

        <!-- WordPress 分类/标签配置 -->
        <el-dialog v-model="showWpTaxonomyDialogVisible" title="WordPress 分类/标签配置" width="1180px" top="4vh">
            <div class="wp-taxonomy-config">
                <div class="wp-taxonomy-config__toolbar">
                    <el-input
                        v-model="wpTaxonomyPageSlug"
                        clearable
                        class="input-w-220"
                        placeholder="页面标识（默认 hot）"
                    >
                        <template #prepend>pageSlug</template>
                    </el-input>
                    <el-button :loading="wpTaxonomyLoading" @click="loadWpTaxonomyRows">刷新数据</el-button>
                    <el-button
                        type="primary"
                        :loading="wpPresetImporting"
                        @click="handleImportHotPresetLibrary"
                    >
                        从 Hot 预设一键写入
                    </el-button>
                    <span class="wp-taxonomy-config__hint">
                        当前会写入到 <code>{{ normalizedWpTaxonomyPageSlug }}</code>，重复项自动跳过。
                    </span>
                </div>
                <el-tabs v-model="wpTaxonomyActiveTab">
                    <el-tab-pane label="分类配置" name="category">
                        <div class="wp-taxonomy-config__action-row">
                            <el-input
                                v-model="wpCategoryKeyword"
                                clearable
                                placeholder="搜索分类（名称 / slug / ID）"
                                class="input-w-320"
                            />
                            <el-button type="primary" @click="openWpTaxonomyEditDialog('category')">
                                新增分类
                            </el-button>
                        </div>
                        <el-table
                            size="large"
                            :data="filteredWpCategoryRows"
                            v-loading="wpTaxonomyLoading"
                            max-height="460"
                        >
                            <el-table-column label="ID" prop="id" width="80" />
                            <el-table-column label="WP分类ID" prop="wpCategoryId" width="110" />
                            <el-table-column label="WordPress 分类名" prop="wpCategoryName" min-width="180" />
                            <el-table-column label="显示名称" prop="displayName" min-width="150" />
                            <el-table-column label="Slug" prop="slug" min-width="130" />
                            <el-table-column label="排序" prop="order" width="90" />
                            <el-table-column label="状态" width="90">
                                <template #default="{ row }">
                                    <el-tag size="small" :type="row.visible ? 'success' : 'info'">
                                        {{ row.visible ? '显示' : '隐藏' }}
                                    </el-tag>
                                </template>
                            </el-table-column>
                            <el-table-column label="操作" width="160" fixed="right">
                                <template #default="{ row }">
                                    <el-button type="primary" link @click="openWpTaxonomyEditDialog('category', row)">
                                        编辑
                                    </el-button>
                                    <el-button type="danger" link @click="handleDeleteWpTaxonomy('category', row)">
                                        删除
                                    </el-button>
                                </template>
                            </el-table-column>
                        </el-table>
                    </el-tab-pane>
                    <el-tab-pane label="标签配置" name="tag">
                        <div class="wp-taxonomy-config__action-row">
                            <el-input
                                v-model="wpTagKeyword"
                                clearable
                                placeholder="搜索标签（名称 / slug / ID）"
                                class="input-w-320"
                            />
                            <el-button type="primary" @click="openWpTaxonomyEditDialog('tag')">
                                新增标签
                            </el-button>
                        </div>
                        <el-table
                            size="large"
                            :data="filteredWpTagRows"
                            v-loading="wpTaxonomyLoading"
                            max-height="460"
                        >
                            <el-table-column label="ID" prop="id" width="80" />
                            <el-table-column label="WP标签ID" prop="wpTagId" width="110" />
                            <el-table-column label="WordPress 标签名" prop="wpTagName" min-width="180" />
                            <el-table-column label="显示名称" prop="displayName" min-width="150" />
                            <el-table-column label="Slug" prop="slug" min-width="130" />
                            <el-table-column label="排序" prop="order" width="90" />
                            <el-table-column label="状态" width="90">
                                <template #default="{ row }">
                                    <el-tag size="small" :type="row.visible ? 'success' : 'info'">
                                        {{ row.visible ? '显示' : '隐藏' }}
                                    </el-tag>
                                </template>
                            </el-table-column>
                            <el-table-column label="操作" width="160" fixed="right">
                                <template #default="{ row }">
                                    <el-button type="primary" link @click="openWpTaxonomyEditDialog('tag', row)">
                                        编辑
                                    </el-button>
                                    <el-button type="danger" link @click="handleDeleteWpTaxonomy('tag', row)">
                                        删除
                                    </el-button>
                                </template>
                            </el-table-column>
                        </el-table>
                    </el-tab-pane>
                </el-tabs>
            </div>
        </el-dialog>

        <!-- WordPress 分类/标签编辑弹窗 -->
        <el-dialog
            v-model="showWpTaxonomyEditDialogVisible"
            :title="wpTaxonomyFormMode === 'add' ? `新增${wpTaxonomyTypeLabel}` : `编辑${wpTaxonomyTypeLabel}`"
            width="640px"
        >
            <el-form
                ref="wpTaxonomyFormRef"
                :model="wpTaxonomyForm"
                :rules="wpTaxonomyFormRules"
                label-width="118px"
            >
                <el-form-item :label="`WordPress${wpTaxonomyTypeLabel}ID`" prop="wpId">
                    <el-input-number v-model="wpTaxonomyForm.wpId" :min="1" class="input-w-220" />
                </el-form-item>
                <el-form-item :label="`WordPress${wpTaxonomyTypeLabel}名`" prop="wpName">
                    <el-input v-model="wpTaxonomyForm.wpName" placeholder="用于匹配远端文章数据" />
                </el-form-item>
                <el-form-item label="显示名称" prop="displayName">
                    <el-input v-model="wpTaxonomyForm.displayName" placeholder="前台筛选项显示文案" />
                </el-form-item>
                <el-form-item label="Slug" prop="slug">
                    <el-input v-model="wpTaxonomyForm.slug" placeholder="英文标识，建议唯一" />
                </el-form-item>
                <el-form-item label="描述">
                    <el-input v-model="wpTaxonomyForm.description" type="textarea" :rows="2" />
                </el-form-item>
                <el-form-item label="排序">
                    <el-input-number v-model="wpTaxonomyForm.order" :min="0" />
                </el-form-item>
                <el-form-item label="状态">
                    <el-switch v-model="wpTaxonomyForm.visible" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="showWpTaxonomyEditDialogVisible = false">取消</el-button>
                <el-button type="primary" :loading="wpTaxonomySaving" @click="handleSaveWpTaxonomy">
                    保存
                </el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script lang="ts" setup name="uiedPage">
import {
    uiedPageList,
    uiedPageAdd,
    uiedPageEdit,
    uiedPageDelete,
    uiedPageCategories,
    uiedPageUpdateCategories,
    uiedCategoryAll,
    uiedSettingGet,
    uiedWebsiteSearch,
    uiedWebsiteList,
    uiedWordpressCategoryList,
    uiedWordpressCategoryAdd,
    uiedWordpressCategoryEdit,
    uiedWordpressCategoryDel,
    uiedWordpressTagList,
    uiedWordpressTagAdd,
    uiedWordpressTagEdit,
    uiedWordpressTagDel,
    uiedWordpressWidgetAdd,
    uiedWordpressWidgetEdit,
    uiedWordpressWidgetList
} from '@/api/uied'
import { usePaging } from '@/hooks/usePaging'
import feedback from '@/utils/feedback'
import type { FormInstance, FormRules } from 'element-plus'

interface CategoryOption {
    id: number
    name: string
    parentId: number | null
    sortOrder: number
    pathLabel: string
    icon?: string
}

interface CategoryTreeNode extends CategoryOption {
    children: CategoryTreeNode[]
}

interface CategorySvgLibraryOption {
    key: string
    label: string
    svg: string
}

interface WordPressWidgetRow {
    id: number
    widgetKey?: string
    widgetName?: string
    title?: string
    order?: number
    visible?: boolean
    pageSlug?: string
    meta?: Record<string, any>
    categoryIds?: number[]
    tagIds?: number[]
    limit?: number
    showMoreLink?: string
}

interface WordPressFilterOption {
    id: number
    label: string
}

interface DesignArticleFixedOption {
    id: number
    label: string
    type: 'category' | 'tag'
}

type WpTaxonomyType = 'category' | 'tag'

interface WpTaxonomyRow {
    id: number
    wpCategoryId?: number
    wpCategoryName?: string
    wpTagId?: number
    wpTagName?: string
    displayName: string
    slug: string
    description?: string
    order: number
    visible: boolean
    pageSlug?: string
}

interface WpTaxonomyFormState {
    id: number
    wpId: number
    wpName: string
    displayName: string
    slug: string
    description: string
    order: number
    visible: boolean
}

interface HotPresetTaxonomySeed {
    key: string
    name: string
    type: WpTaxonomyType
    id: number
}

/**
 * Hot 预设映射库（用于一键导入 WordPress 分类/标签配置）。
 */
const HOT_PRESET_TAXONOMY_LIBRARY: HotPresetTaxonomySeed[] = [
    { key: 'aigc', name: 'AIGC', type: 'category', id: 417 },
    { key: 'ai-tools', name: 'AI工具', type: 'category', id: 3351 },
    { key: 'productivity', name: '效率工具', type: 'category', id: 338 },
    { key: 'design', name: '设计干货', type: 'category', id: 307 },
    { key: 'ui', name: 'UI', type: 'category', id: 334 },
    { key: 'ux', name: 'UX', type: 'category', id: 337 },
    { key: 'product', name: '产品', type: 'category', id: 336 },
    { key: 'graphic', name: '平面', type: 'category', id: 335 },
    { key: '3d', name: '三维', type: 'category', id: 1031 },
    { key: 'tips', name: '设计干货专题', type: 'category', id: 307 },
    { key: 'inspiration', name: '设计灵感', type: 'category', id: 1861 },
    { key: 'all-resources', name: '全部素材', type: 'category', id: 4 },
    { key: 'portfolio', name: '作品集', type: 'category', id: 392 },
    { key: 'card', name: '卡片式', type: 'category', id: 171 },
    { key: 'big-data', name: '可视化', type: 'category', id: 65 },
    { key: 'dashboard', name: '后台', type: 'category', id: 67 },
    { key: 'icon', name: '图标', type: 'category', id: 45 },
    { key: 'ar', name: '增强现实', type: 'category', id: 791 },
    { key: 'app', name: '应用', type: 'category', id: 44 },
    { key: 'watch', name: '手表', type: 'category', id: 66 },
    { key: 'web', name: '网页', type: 'category', id: 75 },
    { key: 'design-system', name: '设计系统/组件', type: 'category', id: 261 },
    { key: '3d-icon', name: '3D/图标', type: 'category', id: 203 },
    { key: 'font-resource', name: '字体素材', type: 'category', id: 319 },
    { key: 'font', name: '字体', type: 'category', id: 319 },
    { key: 'ps-plugin', name: 'PS插件', type: 'category', id: 11013 },
    { key: 'sketch-plugin', name: 'Sketch插件', type: 'category', id: 344 },
    { key: 'mockup', name: '样机', type: 'category', id: 210 },
    { key: 'study-circle', name: '学习圈子', type: 'tag', id: 393 },
    { key: 'nano-banana', name: 'Nano-Banana', type: 'tag', id: 13220 },
    { key: 'midjourney', name: 'Midjourney', type: 'tag', id: 419 },
    { key: 'stable-diffusion', name: 'Stable Diffusion', type: 'tag', id: 428 },
    { key: 'deepseek', name: 'DeepSeek', type: 'tag', id: 3842 },
    { key: 'jimeng', name: '即梦AI', type: 'tag', id: 12110 },
    { key: 'gpt4o', name: 'GPT4o', type: 'tag', id: 4205 },
    { key: 'gpt', name: 'GPT4o', type: 'tag', id: 4205 },
    { key: 'aixiezuo', name: 'AI写作', type: 'tag', id: 3253 },
    { key: 'aihuihua', name: 'AI绘画', type: 'tag', id: 427 },
    { key: 'aishipin', name: 'AI视频', type: 'tag', id: 3484 },
    { key: 'aibangong', name: 'AI办公', type: 'tag', id: 3485 },
    { key: 'aisheji', name: 'AI设计', type: 'tag', id: 3372 },
    { key: 'aikaifa', name: 'AI开发', type: 'tag', id: 3486 },
    { key: 'aishuziren', name: 'AI数字人', type: 'tag', id: 3487 }
]

const queryParams = reactive({
    keyword: '',
    isActive: ''
})

const { pager, getLists } = usePaging({
    fetchFun: uiedPageList,
    params: queryParams
})

const rowSortMap = reactive<Record<number, number>>({})
const rowSortSavingMap = reactive<Record<number, boolean>>({})

const showEdit = ref(false)
const editLoading = ref(false)
const editFormRef = ref<FormInstance>()
const editTab = ref('basic')
const slugTouched = ref(false)
const designArticleFilterLoading = ref(false)
const wordpressCategoryOptions = ref<WordPressFilterOption[]>([])
const wordpressTagOptions = ref<WordPressFilterOption[]>([])
const showWpTaxonomyDialogVisible = ref(false)
const wpTaxonomyLoading = ref(false)
const wpTaxonomySaving = ref(false)
const wpPresetImporting = ref(false)
const wpTaxonomyActiveTab = ref<WpTaxonomyType>('category')
const wpTaxonomyPageSlug = ref('hot')
const wpCategoryKeyword = ref('')
const wpTagKeyword = ref('')
const wpCategoryRows = ref<WpTaxonomyRow[]>([])
const wpTagRows = ref<WpTaxonomyRow[]>([])
const showWpTaxonomyEditDialogVisible = ref(false)
const wpTaxonomyFormMode = ref<'add' | 'edit'>('add')
const wpTaxonomyFormType = ref<WpTaxonomyType>('category')
const wpTaxonomyFormRef = ref<FormInstance>()
const wpTaxonomyForm = reactive<WpTaxonomyFormState>({
    id: 0,
    wpId: 0,
    wpName: '',
    displayName: '',
    slug: '',
    description: '',
    order: 0,
    visible: true
})
const wpTaxonomyFormRules: FormRules = {
    wpId: [{ required: true, message: '请输入 WordPress ID', trigger: 'blur' }],
    wpName: [{ required: true, message: '请输入 WordPress 名称', trigger: 'blur' }],
    displayName: [{ required: true, message: '请输入显示名称', trigger: 'blur' }],
    slug: [{ required: true, message: '请输入 slug', trigger: 'blur' }]
}

// 按分类选择相关
const scrollCategories = ref<any[]>([])
const selectedScrollCategoryIds = ref<number[]>([])
const selectedScrollWebsites = ref<any[]>([])
const isEditLoading = ref(false) // 防止编辑加载时 watcher 覆盖数据

const editData = reactive({
    id: 0,
    name: '',
    slug: '',
    description: '',
    sortOrder: 0,
    isActive: true,
    // Hero 配置
    heroTitle: '',
    heroHighlightText: '',
    heroSubtitle: '',
    hotSearchTagsStr: '', // 用于表单输入，逗号分隔
    heroBgType: 'default',
    heroBgValue: '',
    heroDisplayMode: 'search',
    heroScrollWebsites: [] as number[], // 滚动图标网站ID列表（兼容旧数据）
    heroScrollCategories: [] as number[], // 滚动图标分类ID列表（新方式）
    // 页面配置
    searchPlaceholder: '',
    searchEnabled: true,
    showHotRecommendations: true,
    showCategories: true,
    showSidebar: true,
    themeColor: '',
    designArticleWidgetId: 0,
    designArticleEnabled: true,
    designArticleTitle: '设计文章',
    designArticleLimit: 8,
    designArticleShowMoreLink: '',
    designArticleCategoryIdsText: '',
    designArticleTagIdsText: '',
    designArticleDisplayMode: 'fixed',
    designArticleFixedType: 'category',
    designArticleFixedId: 0
})

const editRules: FormRules = {
    name: [{ required: true, message: '请输入页面名称', trigger: 'blur' }],
    slug: [{ required: true, message: '请输入页面别名', trigger: 'blur' }]
}

/**
 * 规范化 WordPress pageSlug，避免空值导致配置漂移。
 */
const normalizedWpTaxonomyPageSlug = computed(() => {
    const raw = String(wpTaxonomyPageSlug.value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
    return raw || 'hot'
})

/**
 * 当前分类/标签编辑类型对应的中文文案。
 */
const wpTaxonomyTypeLabel = computed(() => (wpTaxonomyFormType.value === 'category' ? '分类' : '标签'))

/**
 * 分类表格搜索结果（名称 / slug / ID）。
 */
const filteredWpCategoryRows = computed(() => {
    const keyword = String(wpCategoryKeyword.value || '').trim().toLowerCase()
    if (!keyword) return wpCategoryRows.value
    return wpCategoryRows.value.filter((item) => {
        const haystack = [
            item.wpCategoryId,
            item.wpCategoryName,
            item.displayName,
            item.slug
        ]
            .map((field) => String(field || '').toLowerCase())
            .join(' ')
        return haystack.includes(keyword)
    })
})

/**
 * 标签表格搜索结果（名称 / slug / ID）。
 */
const filteredWpTagRows = computed(() => {
    const keyword = String(wpTagKeyword.value || '').trim().toLowerCase()
    if (!keyword) return wpTagRows.value
    return wpTagRows.value.filter((item) => {
        const haystack = [item.wpTagId, item.wpTagName, item.displayName, item.slug]
            .map((field) => String(field || '').toLowerCase())
            .join(' ')
        return haystack.includes(keyword)
    })
})

/**
 * 统一解析 WordPress 分类/标签列表返回值，兼容不同接口结构。
 */
const normalizeWordpressFilterRows = (payload: any): any[] => {
    if (Array.isArray(payload)) return payload
    if (Array.isArray(payload?.lists)) return payload.lists
    if (Array.isArray(payload?.rows)) return payload.rows
    if (Array.isArray(payload?.data)) return payload.data
    if (Array.isArray(payload?.data?.lists)) return payload.data.lists
    if (Array.isArray(payload?.data?.rows)) return payload.data.rows
    return []
}

/**
 * 把分类/标签列表映射为统一下拉结构，文案带 ID 便于运营核对。
 */
const mapWordpressFilterOptions = (rows: any[]): WordPressFilterOption[] => {
    const dedupMap = new Map<number, WordPressFilterOption>()
    ;(Array.isArray(rows) ? rows : []).forEach((item: any) => {
        const id = Number.parseInt(
            String(
                item?.wpCategoryId ||
                    item?.wp_category_id ||
                    item?.wpTagId ||
                    item?.wp_tag_id ||
                    item?.termId ||
                    item?.term_id ||
                    item?.id ||
                    0
            ),
            10
        )
        if (!Number.isInteger(id) || id <= 0) return
        const name = String(
            item?.displayName ||
                item?.wpCategoryName ||
                item?.wp_category_name ||
                item?.wpTagName ||
                item?.wp_tag_name ||
                item?.name ||
                item?.title ||
                item?.label ||
                ''
        ).trim()
        const count = Number.parseInt(String(item?.count || 0), 10)
        const countSuffix = Number.isInteger(count) && count >= 0 ? `（${count}）` : ''
        const label = `${name || `ID ${id}`} [${id}]${countSuffix}`
        dedupMap.set(id, { id, label })
    })
    return Array.from(dedupMap.values()).sort((left, right) => left.id - right.id)
}

/**
 * 加载设计文章筛选数据源（分类/标签），用于下拉多选配置。
 */
const loadDesignArticleFilterOptions = async () => {
    if (designArticleFilterLoading.value) return
    designArticleFilterLoading.value = true
    try {
        const [categoryRes, tagRes] = await Promise.all([
            uiedWordpressCategoryList({ pageNo: 1, pageSize: 500 }),
            uiedWordpressTagList({ pageNo: 1, pageSize: 500 })
        ])
        wordpressCategoryOptions.value = mapWordpressFilterOptions(
            normalizeWordpressFilterRows(categoryRes)
        )
        wordpressTagOptions.value = mapWordpressFilterOptions(normalizeWordpressFilterRows(tagRes))
    } catch (error) {
        console.error('加载设计文章筛选源失败:', error)
        feedback.msgWarning('分类/标签加载失败，请稍后重试')
    } finally {
        designArticleFilterLoading.value = false
    }
}

/**
 * 把 WordPress 分类/标签接口响应映射为统一表格结构。
 */
const mapWpTaxonomyRows = (payload: any, type: WpTaxonomyType): WpTaxonomyRow[] => {
    const rows = normalizeWordpressFilterRows(payload)
    return rows
        .map((item: any) => {
            const rowId = Number.parseInt(String(item?.id || 0), 10)
            if (!Number.isInteger(rowId) || rowId <= 0) return null
            const order = Number.parseInt(String(item?.order || item?.sort || 0), 10)
            if (type === 'category') {
                return {
                    id: rowId,
                    wpCategoryId: Number.parseInt(String(item?.wpCategoryId || item?.wp_category_id || 0), 10) || 0,
                    wpCategoryName: String(item?.wpCategoryName || item?.wp_category_name || '').trim(),
                    displayName: String(item?.displayName || item?.display_name || '').trim(),
                    slug: String(item?.slug || '').trim(),
                    description: String(item?.description || '').trim(),
                    order: Number.isInteger(order) ? order : 0,
                    visible: item?.visible !== false,
                    pageSlug: String(item?.pageSlug || item?.page_slug || '').trim()
                } as WpTaxonomyRow
            }
            return {
                id: rowId,
                wpTagId: Number.parseInt(String(item?.wpTagId || item?.wp_tag_id || 0), 10) || 0,
                wpTagName: String(item?.wpTagName || item?.wp_tag_name || '').trim(),
                displayName: String(item?.displayName || item?.display_name || '').trim(),
                slug: String(item?.slug || '').trim(),
                description: String(item?.description || '').trim(),
                order: Number.isInteger(order) ? order : 0,
                visible: item?.visible !== false,
                pageSlug: String(item?.pageSlug || item?.page_slug || '').trim()
            } as WpTaxonomyRow
        })
        .filter((item): item is WpTaxonomyRow => Boolean(item))
        .sort((left, right) => {
            if (left.order !== right.order) return left.order - right.order
            return left.id - right.id
        })
}

/**
 * 拉取指定 pageSlug 的 WordPress 分类/标签配置。
 */
const loadWpTaxonomyRows = async () => {
    if (wpTaxonomyLoading.value) return
    wpTaxonomyLoading.value = true
    try {
        const pageSlug = normalizedWpTaxonomyPageSlug.value
        const [categoryRes, tagRes] = await Promise.all([
            uiedWordpressCategoryList({ pageSlug }),
            uiedWordpressTagList({ pageSlug })
        ])
        wpCategoryRows.value = mapWpTaxonomyRows(categoryRes, 'category')
        wpTagRows.value = mapWpTaxonomyRows(tagRes, 'tag')
    } catch (error) {
        console.error('加载 WordPress 分类/标签配置失败:', error)
        feedback.msgWarning('加载 WordPress 分类/标签配置失败，请稍后重试')
    } finally {
        wpTaxonomyLoading.value = false
    }
}

/**
 * 打开 WordPress 分类/标签配置弹窗。
 */
const openWpTaxonomyDialog = async () => {
    showWpTaxonomyDialogVisible.value = true
    await loadWpTaxonomyRows()
}

/**
 * 重置 WordPress 分类/标签编辑表单。
 */
const resetWpTaxonomyForm = () => {
    Object.assign(wpTaxonomyForm, {
        id: 0,
        wpId: 0,
        wpName: '',
        displayName: '',
        slug: '',
        description: '',
        order: 0,
        visible: true
    })
}

/**
 * 打开分类/标签编辑弹窗；未传 row 时按新增模式处理。
 */
const openWpTaxonomyEditDialog = (type: WpTaxonomyType, row?: WpTaxonomyRow) => {
    wpTaxonomyFormType.value = type
    wpTaxonomyFormMode.value = row ? 'edit' : 'add'
    resetWpTaxonomyForm()
    if (row) {
        Object.assign(wpTaxonomyForm, {
            id: Number(row.id || 0),
            wpId: Number(type === 'category' ? row.wpCategoryId : row.wpTagId) || 0,
            wpName: String(type === 'category' ? row.wpCategoryName : row.wpTagName || '').trim(),
            displayName: String(row.displayName || '').trim(),
            slug: String(row.slug || '').trim(),
            description: String(row.description || '').trim(),
            order: Number(row.order || 0),
            visible: row.visible !== false
        })
    }
    showWpTaxonomyEditDialogVisible.value = true
    nextTick(() => {
        wpTaxonomyFormRef.value?.clearValidate()
    })
}

/**
 * 组装分类/标签提交参数，统一补齐 pageSlug 与字段映射。
 */
const buildWpTaxonomyPayload = () => {
    const basePayload = {
        id: wpTaxonomyForm.id || undefined,
        displayName: String(wpTaxonomyForm.displayName || '').trim(),
        slug: String(wpTaxonomyForm.slug || '').trim().toLowerCase(),
        description: String(wpTaxonomyForm.description || '').trim(),
        order: Number.parseInt(String(wpTaxonomyForm.order || 0), 10) || 0,
        visible: wpTaxonomyForm.visible !== false,
        pageSlug: normalizedWpTaxonomyPageSlug.value
    }
    if (wpTaxonomyFormType.value === 'category') {
        return {
            ...basePayload,
            wpCategoryId: Number.parseInt(String(wpTaxonomyForm.wpId || 0), 10) || 0,
            wpCategoryName: String(wpTaxonomyForm.wpName || '').trim()
        }
    }
    return {
        ...basePayload,
        wpTagId: Number.parseInt(String(wpTaxonomyForm.wpId || 0), 10) || 0,
        wpTagName: String(wpTaxonomyForm.wpName || '').trim()
    }
}

/**
 * 保存分类/标签配置（新增或编辑）。
 */
const handleSaveWpTaxonomy = async () => {
    await wpTaxonomyFormRef.value?.validate()
    wpTaxonomySaving.value = true
    try {
        const payload = buildWpTaxonomyPayload()
        if (wpTaxonomyFormType.value === 'category') {
            if (wpTaxonomyFormMode.value === 'edit') {
                await uiedWordpressCategoryEdit(payload)
            } else {
                await uiedWordpressCategoryAdd(payload)
            }
        } else if (wpTaxonomyFormMode.value === 'edit') {
            await uiedWordpressTagEdit(payload)
        } else {
            await uiedWordpressTagAdd(payload)
        }
        feedback.msgSuccess(`${wpTaxonomyFormMode.value === 'edit' ? '更新' : '新增'}成功`)
        showWpTaxonomyEditDialogVisible.value = false
        await loadWpTaxonomyRows()
    } catch (error) {
        console.error('保存 WordPress 分类/标签配置失败:', error)
    } finally {
        wpTaxonomySaving.value = false
    }
}

/**
 * 删除分类/标签配置。
 */
const handleDeleteWpTaxonomy = async (type: WpTaxonomyType, row: WpTaxonomyRow) => {
    await feedback.confirm(`确定删除该${type === 'category' ? '分类' : '标签'}配置吗？`)
    if (type === 'category') {
        await uiedWordpressCategoryDel({ id: row.id })
    } else {
        await uiedWordpressTagDel({ id: row.id })
    }
    feedback.msgSuccess('删除成功')
    await loadWpTaxonomyRows()
}

/**
 * 规范化 Hot 预设导入时使用的 slug。
 */
const normalizeHotPresetSlug = (value: string): string =>
    String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '')
        .slice(0, 64) || 'preset'

/**
 * 从 Hot 预设库一键导入到 WordPress 分类/标签表（按 pageSlug 写入，重复 ID 自动跳过）。
 */
const handleImportHotPresetLibrary = async () => {
    if (wpPresetImporting.value) return
    wpPresetImporting.value = true
    try {
        await loadWpTaxonomyRows()
        const categoryIdSet = new Set(
            wpCategoryRows.value
                .map((item) => Number(item.wpCategoryId || 0))
                .filter((id) => Number.isInteger(id) && id > 0)
        )
        const tagIdSet = new Set(
            wpTagRows.value
                .map((item) => Number(item.wpTagId || 0))
                .filter((id) => Number.isInteger(id) && id > 0)
        )
        let addCount = 0
        let skipCount = 0
        let failCount = 0
        const pageSlug = normalizedWpTaxonomyPageSlug.value
        for (let index = 0; index < HOT_PRESET_TAXONOMY_LIBRARY.length; index += 1) {
            const item = HOT_PRESET_TAXONOMY_LIBRARY[index]
            const sortOrder = (index + 1) * 10
            try {
                if (item.type === 'category') {
                    if (categoryIdSet.has(item.id)) {
                        skipCount += 1
                        continue
                    }
                    await uiedWordpressCategoryAdd({
                        wpCategoryId: item.id,
                        wpCategoryName: item.name,
                        displayName: item.name,
                        slug: normalizeHotPresetSlug(item.key),
                        description: 'Hot 预设一键导入',
                        order: sortOrder,
                        visible: true,
                        pageSlug
                    })
                    categoryIdSet.add(item.id)
                    addCount += 1
                    continue
                }
                if (tagIdSet.has(item.id)) {
                    skipCount += 1
                    continue
                }
                await uiedWordpressTagAdd({
                    wpTagId: item.id,
                    wpTagName: item.name,
                    displayName: item.name,
                    slug: normalizeHotPresetSlug(item.key),
                    description: 'Hot 预设一键导入',
                    order: sortOrder,
                    visible: true,
                    pageSlug
                })
                tagIdSet.add(item.id)
                addCount += 1
            } catch (error) {
                failCount += 1
                console.error('导入 Hot 预设失败:', item, error)
            }
        }
        await loadWpTaxonomyRows()
        feedback.msgSuccess(`导入完成：新增 ${addCount} 条，跳过 ${skipCount} 条，失败 ${failCount} 条`)
    } finally {
        wpPresetImporting.value = false
    }
}

/**
 * 设计文章分类 ID 与文本字段双向同步（逗号文本 <-> 下拉多选）。
 */
const designArticleCategoryIdsModel = computed<number[]>({
    get: () => parseNumberIdList(editData.designArticleCategoryIdsText),
    set: (value) => {
        editData.designArticleCategoryIdsText = toNumberIdText(value)
    }
})

/**
 * 设计文章标签 ID 与文本字段双向同步（逗号文本 <-> 下拉多选）。
 */
const designArticleTagIdsModel = computed<number[]>({
    get: () => parseNumberIdList(editData.designArticleTagIdsText),
    set: (value) => {
        editData.designArticleTagIdsText = toNumberIdText(value)
    }
})

/**
 * 规范化设计文章展示模式。
 */
const normalizeDesignArticleDisplayMode = (value: unknown): 'fixed' | 'tabs' => {
    const mode = String(value || '').trim().toLowerCase()
    return mode === 'tabs' ? 'tabs' : 'fixed'
}

/**
 * 规范化固定来源类型。
 */
const normalizeDesignArticleFixedType = (value: unknown): 'category' | 'tag' => {
    const type = String(value || '').trim().toLowerCase()
    return type === 'tag' ? 'tag' : 'category'
}

/**
 * 构建“固定展示项”下拉列表。
 */
const designArticleFixedOptions = computed<DesignArticleFixedOption[]>(() => {
    const fixedType = normalizeDesignArticleFixedType(editData.designArticleFixedType)
    if (fixedType === 'tag') {
        const selectedTagIds = new Set(parseNumberIdList(editData.designArticleTagIdsText))
        return wordpressTagOptions.value
            .filter((item) => selectedTagIds.has(item.id))
            .map((item) => ({ id: item.id, label: item.label, type: 'tag' as const }))
    }
    const selectedCategoryIds = new Set(parseNumberIdList(editData.designArticleCategoryIdsText))
    return wordpressCategoryOptions.value
        .filter((item) => selectedCategoryIds.has(item.id))
        .map((item) => ({ id: item.id, label: item.label, type: 'category' as const }))
})

/**
 * 基于当前来源与已选分类/标签，推导固定项兜底 ID。
 */
const resolveDesignArticleFixedFallbackId = (
    fixedType: 'category' | 'tag',
    categoryIds: number[],
    tagIds: number[]
): number => {
    if (fixedType === 'tag') return Number(tagIds[0] || 0)
    return Number(categoryIds[0] || 0)
}

/**
 * 同步固定展示项，避免来源切换后残留无效 ID。
 */
const syncDesignArticleFixedSelection = () => {
    const displayMode = normalizeDesignArticleDisplayMode(editData.designArticleDisplayMode)
    if (displayMode !== 'fixed') return
    const fixedType = normalizeDesignArticleFixedType(editData.designArticleFixedType)
    const categoryIds = parseNumberIdList(editData.designArticleCategoryIdsText)
    const tagIds = parseNumberIdList(editData.designArticleTagIdsText)
    const options = designArticleFixedOptions.value
    const normalizedCurrentId = Number.parseInt(String(editData.designArticleFixedId || 0), 10) || 0
    const matched = options.some((item) => item.id === normalizedCurrentId)
    if (matched) return
    editData.designArticleFixedId = resolveDesignArticleFixedFallbackId(fixedType, categoryIds, tagIds)
}

/**
 * 从页面名称生成默认别名（仅新建时自动生成）。
 */
const buildSlugFromName = (name: string): string => {
    const normalized = String(name || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
    return normalized.slice(0, 80)
}

/**
 * 解析数字 ID 列表，兼容英文逗号、中文逗号、空格和换行。
 */
const parseNumberIdList = (value: unknown): number[] => {
    return Array.from(
        new Set(
            String(value || '')
                .split(/[,\n，\s]+/)
                .map((item) => Number.parseInt(String(item || '').trim(), 10))
                .filter((item) => Number.isFinite(item) && item > 0)
        )
    )
}

/**
 * 把 ID 列表序列化为逗号文本，便于在表单内编辑。
 */
const toNumberIdText = (value: unknown): string => {
    const rows = Array.isArray(value) ? value : []
    return rows
        .map((item) => Number.parseInt(String(item || ''), 10))
        .filter((item) => Number.isFinite(item) && item > 0)
        .join(',')
}

watch(
    [
        () => editData.designArticleDisplayMode,
        () => editData.designArticleFixedType,
        () => editData.designArticleCategoryIdsText,
        () => editData.designArticleTagIdsText
    ],
    () => {
        syncDesignArticleFixedSelection()
    }
)

/**
 * 从页面 slug 拉取设计文章组件配置并回填编辑表单。
 */
const loadDesignArticleWidgetConfig = async (pageSlug: string) => {
    const normalizedSlug = String(pageSlug || '').trim()
    if (!normalizedSlug) {
        editData.designArticleWidgetId = 0
        editData.designArticleEnabled = true
        editData.designArticleTitle = '设计文章'
        editData.designArticleLimit = 8
        editData.designArticleShowMoreLink = ''
        editData.designArticleCategoryIdsText = ''
        editData.designArticleTagIdsText = ''
        editData.designArticleDisplayMode = 'fixed'
        editData.designArticleFixedType = 'category'
        editData.designArticleFixedId = 0
        return
    }
    try {
        const rows = (await uiedWordpressWidgetList({ pageSlug: normalizedSlug })) as WordPressWidgetRow[] | undefined
        const list = Array.isArray(rows) ? rows : []
        const targetByKey = list.find(
            (item) => String(item?.widgetKey || '').trim() === 'design-article-grid-container'
        )
        const target =
            targetByKey ||
            list.find((item) => {
                const position = String(item?.meta?.position || '').trim().toLowerCase()
                const componentType = String(item?.meta?.componentType || '').trim().toLowerCase()
                return position === 'main' && componentType === 'designarticlegrid'
            })
        if (!target) {
            editData.designArticleWidgetId = 0
            editData.designArticleEnabled = true
            editData.designArticleTitle = '设计文章'
            editData.designArticleLimit = 8
            editData.designArticleShowMoreLink = ''
            editData.designArticleCategoryIdsText = ''
            editData.designArticleTagIdsText = ''
            editData.designArticleDisplayMode = 'fixed'
            editData.designArticleFixedType = 'category'
            editData.designArticleFixedId = 0
            return
        }
        const meta = target.meta && typeof target.meta === 'object' ? target.meta : {}
        const categoryIds = Array.isArray(meta.categoryIds) ? meta.categoryIds : target.categoryIds || []
        const tagIds = Array.isArray(meta.tagIds) ? meta.tagIds : target.tagIds || []
        editData.designArticleWidgetId = Number(target.id || 0)
        editData.designArticleEnabled = target.visible !== false
        editData.designArticleTitle = String(target.title || meta.title || '设计文章').trim() || '设计文章'
        editData.designArticleLimit = Number.parseInt(String(meta.limit ?? target.limit ?? 8), 10) || 8
        editData.designArticleShowMoreLink = String(meta.showMoreLink || target.showMoreLink || '').trim()
        editData.designArticleCategoryIdsText = toNumberIdText(categoryIds)
        editData.designArticleTagIdsText = toNumberIdText(tagIds)
        const hasDisplayMode =
            meta.displayMode !== undefined &&
            meta.displayMode !== null &&
            String(meta.displayMode).trim() !== ''
        const displayMode =
            meta.enableSubCategories === true
                ? 'tabs'
                : meta.enableSubCategories === false
                ? 'fixed'
                : hasDisplayMode
                ? normalizeDesignArticleDisplayMode(meta.displayMode)
                : 'tabs'
        const fixedType = normalizeDesignArticleFixedType(meta.fixedFilterType)
        const fixedId = Number.parseInt(String(meta.fixedFilterId || 0), 10) || 0
        editData.designArticleDisplayMode = displayMode
        editData.designArticleFixedType = fixedType
        editData.designArticleFixedId =
            fixedId || resolveDesignArticleFixedFallbackId(fixedType, categoryIds, tagIds)
        syncDesignArticleFixedSelection()
    } catch (error) {
        console.error('加载设计文章组件配置失败:', error)
        editData.designArticleWidgetId = 0
        editData.designArticleDisplayMode = 'fixed'
        editData.designArticleFixedType = 'category'
        editData.designArticleFixedId = 0
    }
}

/**
 * 同步页面对应的设计文章组件配置（design-article-grid-container）。
 */
const syncDesignArticleWidgetConfig = async (pageSlug: string) => {
    const normalizedSlug = String(pageSlug || '').trim()
    if (!normalizedSlug) return
    const categoryIds = parseNumberIdList(editData.designArticleCategoryIdsText)
    const tagIds = parseNumberIdList(editData.designArticleTagIdsText)
    const displayMode = normalizeDesignArticleDisplayMode(editData.designArticleDisplayMode)
    const fixedType = normalizeDesignArticleFixedType(editData.designArticleFixedType)
    const fixedId =
        Number.parseInt(String(editData.designArticleFixedId || 0), 10) ||
        resolveDesignArticleFixedFallbackId(fixedType, categoryIds, tagIds)
    const payload = {
        id: editData.designArticleWidgetId || undefined,
        widgetKey: 'design-article-grid-container',
        widgetName: 'DesignArticleGrid',
        title: String(editData.designArticleTitle || '设计文章').trim() || '设计文章',
        content: '',
        order: 10,
        visible: editData.designArticleEnabled !== false,
        pageSlug: normalizedSlug,
        meta: {
            position: 'main',
            componentType: 'designArticleGrid',
            limit: Number.parseInt(String(editData.designArticleLimit || 8), 10) || 8,
            showMoreLink: String(editData.designArticleShowMoreLink || '').trim(),
            categoryIds,
            tagIds,
            displayMode,
            enableSubCategories: displayMode === 'tabs',
            fixedFilterType: fixedType,
            fixedFilterId: fixedId
        },
    }
    if (editData.designArticleWidgetId > 0) {
        await uiedWordpressWidgetEdit(payload)
        return
    }
    const addResult = (await uiedWordpressWidgetAdd(payload)) as any
    editData.designArticleWidgetId = Number(addResult?.id || editData.designArticleWidgetId || 0)
}

/**
 * 手动修改别名后，停止自动覆盖。
 */
const handleSlugInput = () => {
    slugTouched.value = true
}

/**
 * 页面列表查询。
 */
const handleSearch = () => {
    pager.page = 1
    getLists()
}

/**
 * 重置页面列表查询条件。
 */
const handleResetSearch = () => {
    queryParams.keyword = ''
    queryParams.isActive = ''
    pager.page = 1
    getLists()
}

// 获取背景值占位符
const getBgPlaceholder = () => {
    switch (editData.heroBgType) {
        case 'color':
            return '#1a1a2e'
        case 'gradient':
            return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        case 'image':
            return 'https://example.com/bg.jpg'
        default:
            return ''
    }
}

// 获取背景值提示
const getBgHint = () => {
    switch (editData.heroBgType) {
        case 'color':
            return '输入十六进制颜色值，如 #1a1a2e'
        case 'gradient':
            return '输入 CSS 渐变值，如 linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        case 'image':
            return '输入图片 URL 地址'
        default:
            return ''
    }
}

// 加载分类列表（只显示有网站的子分类）
const loadScrollCategories = async () => {
    try {
        const cats = await uiedCategoryAll()
        // 仅保留子分类，避免把顶级分类混入滚动图标来源。
        scrollCategories.value = (cats || []).filter(
            (c: any) => Number.parseInt(String(c?.parentId || 0), 10) > 0
        )
    } catch (e) {
        console.error('加载分类失败:', e)
    }
}

/**
 * 根据网站列表反推“滚动图标分类”已选值，便于编辑态正确回显。
 */
const resolveScrollCategoryIdsByWebsites = (websites: any[]): number[] => {
    const ids = new Set<number>()
    ;(Array.isArray(websites) ? websites : []).forEach((website) => {
        const categoryIds = Array.isArray(website?.categoryIds)
            ? website.categoryIds
            : []
        categoryIds.forEach((rawId: any) => {
            const parsed = Number.parseInt(String(rawId || 0), 10)
            if (Number.isInteger(parsed) && parsed > 0) ids.add(parsed)
        })
        const primaryCategoryId = Number.parseInt(String(website?.categoryId || 0), 10)
        if (Number.isInteger(primaryCategoryId) && primaryCategoryId > 0) {
            ids.add(primaryCategoryId)
        }
    })
    return Array.from(ids)
}

// 监听分类选择变化，自动获取分类下的网站并更新 selectedScrollWebsites
const loadingScrollWebsites = ref(false)
watch(selectedScrollCategoryIds, async (newIds) => {
    // 编辑加载时不触发，避免覆盖已有数据
    if (isEditLoading.value) return
    const normalizedIds = Array.from(
        new Set(
            (Array.isArray(newIds) ? newIds : [])
                .map((item) => Number.parseInt(String(item || 0), 10))
                .filter((item) => Number.isInteger(item) && item > 0)
        )
    )
    if (normalizedIds.length === 0) {
        selectedScrollWebsites.value = []
        return
    }
    loadingScrollWebsites.value = true
    try {
        // 逐个分类获取网站，合并去重
        const allWebsites: any[] = []
        const seenIds = new Set<string>()
        for (const catId of normalizedIds) {
            const res = await uiedWebsiteList({
                categoryId: catId,
                includeChildren: 'true',
                pageSize: 500,
                pageNo: 1
            })
            const websites = res?.lists || []
            for (const w of websites) {
                const websiteId = String(w?.id || '')
                if (!websiteId || seenIds.has(websiteId)) continue
                seenIds.add(websiteId)
                allWebsites.push(w)
            }
        }
        selectedScrollWebsites.value = allWebsites
    } catch (e) {
        console.error('根据分类加载网站失败:', e)
        selectedScrollWebsites.value = []
    } finally {
        loadingScrollWebsites.value = false
    }
})

/**
 * Hero 显示模式切换为“搜索框模式”时，清空滚动图标分类与网站选择，避免误保存旧配置。
 */
watch(
    () => editData.heroDisplayMode,
    (mode) => {
        if (!showEdit.value) return
        if (isEditLoading.value) return
        if (mode === 'iconScroll') return
        selectedScrollCategoryIds.value = []
        selectedScrollWebsites.value = []
    }
)

const resetEditData = () => {
    Object.assign(editData, {
        id: 0,
        name: '',
        slug: '',
        description: '',
        sortOrder: 0,
        isActive: true,
        heroTitle: '',
        heroHighlightText: '',
        heroSubtitle: '',
        hotSearchTagsStr: '',
        heroBgType: 'default',
        heroBgValue: '',
        heroDisplayMode: 'search',
        heroScrollWebsites: [],
        heroScrollCategories: [],
        searchPlaceholder: '',
        searchEnabled: true,
        showHotRecommendations: true,
        showCategories: true,
        showSidebar: true,
        themeColor: '',
        designArticleWidgetId: 0,
        designArticleEnabled: true,
        designArticleTitle: '设计文章',
        designArticleLimit: 8,
        designArticleShowMoreLink: '',
        designArticleCategoryIdsText: '',
        designArticleTagIdsText: '',
        designArticleDisplayMode: 'fixed',
        designArticleFixedType: 'category',
        designArticleFixedId: 0
    })
    slugTouched.value = false
    selectedScrollCategoryIds.value = []
    editTab.value = 'basic'
}

const handleAdd = () => {
    resetEditData()
    loadScrollCategories()
    loadDesignArticleFilterOptions()
    showEdit.value = true
}

/**
 * 打开编辑弹窗；支持通过 initialTab 快速定位到指定配置分区。
 */
const handleEdit = async (row: any, initialTab: 'basic' | 'hero' | 'config' = 'basic') => {
    isEditLoading.value = true
    slugTouched.value = true
    selectedScrollCategoryIds.value = []
    selectedScrollWebsites.value = []
    // 转换热门标签数组为字符串
    const hotSearchTagsStr = Array.isArray(row.hotSearchTags)
        ? row.hotSearchTags.join(',')
        : row.hotSearchTags || ''

    // 解析滚动网站ID列表
    let heroScrollWebsites: any[] = []
    if (row.heroScrollWebsites) {
        try {
            heroScrollWebsites =
                typeof row.heroScrollWebsites === 'string'
                    ? JSON.parse(row.heroScrollWebsites)
                    : Array.isArray(row.heroScrollWebsites)
                    ? row.heroScrollWebsites
                    : []
        } catch (e) {
            heroScrollWebsites = []
        }
    }

    Object.assign(editData, {
        ...row,
        hotSearchTagsStr,
        heroScrollWebsites,
        searchEnabled: row.searchEnabled !== false,
        showHotRecommendations: row.showHotRecommendations !== false,
        showCategories: row.showCategories !== false,
        showSidebar: row.showSidebar !== false
    })

    await loadDesignArticleWidgetConfig(String(row.slug || ''))
    await loadDesignArticleFilterOptions()

    // 加载分类列表
    await loadScrollCategories()

    const isIconScrollMode = String(row?.heroDisplayMode || '').trim() === 'iconScroll'

    // 如果有滚动网站，加载网站详情
    if (isIconScrollMode && heroScrollWebsites.length > 0) {
        try {
            // 使用 uiedWebsiteSearch 通过 ids 参数查询，支持新旧ID格式
            const idsStr = heroScrollWebsites.map((id) => String(id)).join(',')
            const res = await uiedWebsiteSearch({ ids: idsStr, pageSize: 200 })
            // likeadmin 返回格式: { lists: [...], count: ... }
            const websites = res?.lists || []

            console.log('加载滚动网站:', { heroScrollWebsites, idsStr, res, websites })

            if (websites.length > 0) {
                // 按原顺序排列，支持新数字ID和旧cuid格式
                selectedScrollWebsites.value = heroScrollWebsites
                    .map((id: any) =>
                        websites.find(
                            (w: any) =>
                                String(w.id) === String(id) ||
                                w.oldId === id ||
                                w.oldId === String(id)
                        )
                    )
                    .filter(Boolean)
                const matchedCategoryIds = resolveScrollCategoryIdsByWebsites(
                    selectedScrollWebsites.value
                )
                const availableCategoryIds = new Set(
                    scrollCategories.value.map((item: any) =>
                        Number.parseInt(String(item?.id || 0), 10)
                    )
                )
                selectedScrollCategoryIds.value = matchedCategoryIds.filter((id) =>
                    availableCategoryIds.has(id)
                )
            } else {
                selectedScrollWebsites.value = []
                selectedScrollCategoryIds.value = []
            }
        } catch (e) {
            console.error('加载滚动网站失败:', e)
            selectedScrollWebsites.value = []
            selectedScrollCategoryIds.value = []
        }
    } else {
        selectedScrollWebsites.value = []
        selectedScrollCategoryIds.value = []
    }

    editTab.value = initialTab
    showEdit.value = true
    isEditLoading.value = false
}

const handleSubmit = async () => {
    await editFormRef.value?.validate()
    editLoading.value = true
    try {
        const isIconScrollMode = editData.heroDisplayMode === 'iconScroll'
        // 转换热门标签字符串为数组
        const submitData = {
            ...editData,
            hotSearchTags: editData.hotSearchTagsStr
                ? editData.hotSearchTagsStr
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean)
                : [],
            heroScrollWebsites: isIconScrollMode
                ? selectedScrollWebsites.value.map((w) => w.id)
                : []
        }
        delete (submitData as any).hotSearchTagsStr

        let savedPage: any = null
        const isEditing = Boolean(editData.id)
        if (isEditing) {
            savedPage = await uiedPageEdit(submitData)
        } else {
            savedPage = await uiedPageAdd(submitData)
        }
        const savedSlug = String(savedPage?.slug || submitData.slug || '').trim()
        await syncDesignArticleWidgetConfig(savedSlug)
        feedback.msgSuccess(isEditing ? '编辑成功' : '添加成功')
        showEdit.value = false
        getLists()
    } finally {
        editLoading.value = false
    }
}

const handleDelete = async (id: number) => {
    await feedback.confirm('确定要删除该页面吗？')
    await uiedPageDelete({ id })
    feedback.msgSuccess('删除成功')
    getLists()
}

// 分类配置
const showCategories = ref(false)
const categoryLoading = ref(false)
const currentPageId = ref(0)
const categoryKeyword = ref('')
const categoryTreeRef = ref<any>()
const categoryTreeData = ref<CategoryTreeNode[]>([])
const categoryMap = ref<Record<number, CategoryOption>>({})
const categoryCheckedKeys = ref<number[]>([])
const categorySelectedRows = ref<CategoryOption[]>([])
const categorySvgLibraryOptions = ref<CategorySvgLibraryOption[]>([])

/**
 * 清洗 SVG 文本，去除脚本与内联事件，避免在后台预览时执行不安全内容。
 */
const sanitizeSvgMarkup = (value: unknown): string => {
    const text = String(value || '').trim()
    if (!text) return ''
    const sanitized = text
        .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
        .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
        .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
        .replace(/javascript:/gi, '')
        .trim()
    return sanitized.toLowerCase().startsWith('<svg') ? sanitized : ''
}

/**
 * 规范化 SVG 图标库列表，兼容对象/数组/JSON 字符串。
 */
const normalizeCategorySvgLibrary = (value: unknown): CategorySvgLibraryOption[] => {
    let source = value
    if (typeof source === 'string') {
        try {
            source = JSON.parse(source)
        } catch (_error) {
            source = []
        }
    }
    const rows = Array.isArray(source)
        ? source
        : source && typeof source === 'object'
        ? Object.keys(source as Record<string, unknown>).map((key) => ({
              key,
              svg: (source as Record<string, unknown>)[key]
          }))
        : []
    return rows
        .map((item: any, index: number) => {
            const key = String(item?.key || '')
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9_-]/g, '')
                .slice(0, 40)
            if (!key) return null
            const svg = sanitizeSvgMarkup(item?.svg)
            if (!svg) return null
            const label = String(item?.label || key).trim().slice(0, 40) || key
            const sort = Number.isFinite(Number(item?.sort)) ? Number(item.sort) : index + 1
            return { key, label, svg, sort }
        })
        .filter((item): item is CategorySvgLibraryOption & { sort: number } => Boolean(item))
        .sort((a, b) => a.sort - b.sort)
        .map(({ key, label, svg }) => ({ key, label, svg }))
}

/**
 * 判断图标字段是否为 svg:key 模式。
 */
const isSvgIconToken = (value: unknown): boolean => /^svg:/i.test(String(value || '').trim())

/**
 * 获取当前分类图标编辑模式。
 */
const getCategoryIconMode = (item: CategoryOption): 'svg' | 'icon' =>
    isSvgIconToken(item?.icon) ? 'svg' : 'icon'

/**
 * 切换分类图标编辑模式（SVG 图标库 / 系统图标）。
 */
const handleCategoryIconModeChange = (
    item: CategoryOption,
    mode: string | number | boolean
) => {
    const normalizedMode = String(mode || '').trim().toLowerCase()
    if (!item) return
    if (normalizedMode === 'svg') {
        if (isSvgIconToken(item.icon)) return
        const firstOption = categorySvgLibraryOptions.value[0]
        item.icon = firstOption ? `svg:${firstOption.key}` : ''
        return
    }
    if (!isSvgIconToken(item.icon)) return
    item.icon = ''
}

/**
 * 根据 svg:key 解析对应 SVG 代码，用于弹窗内即时预览。
 */
const resolveSvgIconMarkup = (value: unknown): string => {
    const raw = String(value || '').trim()
    if (!/^svg:/i.test(raw)) return ''
    const key = raw
        .slice(4)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '')
        .slice(0, 40)
    if (!key) return ''
    const matched = categorySvgLibraryOptions.value.find((item) => item.key === key)
    return matched?.svg || ''
}

/**
 * 加载系统设置中的 SVG 图标库。
 */
const loadCategorySvgLibrary = async () => {
    try {
        const res = await uiedSettingGet({ key: 'pageGlobalConfig' })
        const normalized = normalizeCategorySvgLibrary((res as any)?.categorySvgLibrary)
        categorySvgLibraryOptions.value = normalized
    } catch (error) {
        console.error('加载分类 SVG 图标库失败:', error)
        categorySvgLibraryOptions.value = []
    }
}

/**
 * 构建分类树和路径标签，便于运营快速定位一级/二级分类。
 */
const buildCategoryTree = (rows: any[]): { tree: CategoryTreeNode[]; map: Record<number, CategoryOption> } => {
    const normalizedRows = (rows || [])
        .map((item: any) => ({
            id: Number(item.id),
            name: String(item.name || '').trim(),
            parentId:
                item.parentId === null || item.parentId === undefined || item.parentId === ''
                    ? null
                    : Number(item.parentId),
            sortOrder: Number(item.order || item.sortOrder || 0),
            icon: String(item.icon || '').trim()
        }))
        .filter((item: any) => Number.isFinite(item.id) && item.id > 0)
    const byParent = new Map<number | null, any[]>()
    normalizedRows.forEach((item: any) => {
        const key = item.parentId === null ? null : Number(item.parentId)
        if (!byParent.has(key)) byParent.set(key, [])
        byParent.get(key)?.push(item)
    })
    byParent.forEach((list) => {
        list.sort((left, right) => {
            if (left.sortOrder !== right.sortOrder) return left.sortOrder - right.sortOrder
            return left.id - right.id
        })
    })

    const optionMap: Record<number, CategoryOption> = {}

    /**
     * 递归构建树节点并拼装分类路径。
     */
    const buildNodes = (parentId: number | null, parentNames: string[]): CategoryTreeNode[] => {
        const currentRows = byParent.get(parentId) || []
        return currentRows.map((item: any) => {
            const pathParts = [ ...parentNames, item.name ]
            const node: CategoryTreeNode = {
                id: item.id,
                name: item.name,
                parentId: item.parentId,
                sortOrder: item.sortOrder,
                pathLabel: pathParts.join(' / '),
                children: []
            }
            optionMap[node.id] = {
                id: node.id,
                name: node.name,
                parentId: node.parentId,
                sortOrder: node.sortOrder,
                pathLabel: node.pathLabel,
                icon: item.icon
            }
            node.children = buildNodes(node.id, pathParts)
            return node
        })
    }

    return {
        tree: buildNodes(null, []),
        map: optionMap
    }
}

/**
 * 同步“已选分类”列表，保留人工排序结果。
 */
const syncSelectedCategories = (keys: number[]) => {
    const uniqueKeys = Array.from(new Set(keys.map((key) => Number(key)).filter((key) => Number.isFinite(key))))
    const existingById = new Map(categorySelectedRows.value.map((item) => [item.id, item]))
    const reserved = categorySelectedRows.value.filter((item) => uniqueKeys.includes(item.id))
    const appended = uniqueKeys
        .filter((key) => !existingById.has(key))
        .map((key) => categoryMap.value[key])
        .filter(Boolean)
    categorySelectedRows.value = [ ...reserved, ...appended ]
    categoryCheckedKeys.value = uniqueKeys
}

/**
 * 分类树筛选逻辑。
 */
const filterCategoryNode = (keyword: string, data: any): boolean => {
    if (!keyword) return true
    return String(data?.pathLabel || data?.name || '')
        .toLowerCase()
        .includes(String(keyword).toLowerCase())
}

/**
 * 分类树关键字变化时，触发 tree 过滤。
 */
const handleCategoryKeywordChange = (value: string) => {
    categoryTreeRef.value?.filter(String(value || '').trim())
}

/**
 * 响应分类树勾选变化。
 */
const handleCategoryTreeCheck = () => {
    const keys = (categoryTreeRef.value?.getCheckedKeys(false) || []) as number[]
    syncSelectedCategories(keys)
}

/**
 * 移动已选分类顺序。
 */
const moveSelectedCategory = (index: number, delta: number) => {
    const targetIndex = index + delta
    if (targetIndex < 0 || targetIndex >= categorySelectedRows.value.length) return
    const list = [ ...categorySelectedRows.value ]
    const [current] = list.splice(index, 1)
    list.splice(targetIndex, 0, current)
    categorySelectedRows.value = list
}

/**
 * 移除某个已选分类。
 */
const removeSelectedCategory = (categoryId: number) => {
    categorySelectedRows.value = categorySelectedRows.value.filter((item) => item.id !== categoryId)
    categoryCheckedKeys.value = categorySelectedRows.value.map((item) => item.id)
    categoryTreeRef.value?.setCheckedKeys(categoryCheckedKeys.value, false)
}

/**
 * 清空已选分类。
 */
const clearSelectedCategories = () => {
    categorySelectedRows.value = []
    categoryCheckedKeys.value = []
    categoryTreeRef.value?.setCheckedKeys([], false)
}

/**
 * 打开分类配置弹窗。
 */
const handleCategories = async (row: any) => {
    currentPageId.value = Number(row.id)
    const [cats, pageCats] = await Promise.all([
        uiedCategoryAll(),
        uiedPageCategories({ id: row.id }),
        loadCategorySvgLibrary()
    ])
    const { tree, map } = buildCategoryTree(cats || [])
    categoryTreeData.value = tree
    categoryMap.value = map
    const orderedPageCats = [ ...(pageCats || []) ].sort(
        (left: any, right: any) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0)
    )
    const selectedIds = orderedPageCats
        .map((item: any) => Number(item.id))
        .filter((id: number) => Number.isFinite(id))
    categoryKeyword.value = ''
    categoryCheckedKeys.value = selectedIds
    categorySelectedRows.value = selectedIds
        .map((id: number) => categoryMap.value[id])
        .filter((item: CategoryOption | undefined): item is CategoryOption => Boolean(item))
    showCategories.value = true
    await nextTick()
    categoryTreeRef.value?.setCheckedKeys(categoryCheckedKeys.value, false)
    categoryTreeRef.value?.filter('')
}

/**
 * 保存页面分类配置。
 */
const handleSaveCategories = async () => {
    categoryLoading.value = true
    try {
        const categoryIconMap = categorySelectedRows.value.reduce(
            (result: Record<string, string>, item: CategoryOption) => {
                result[String(item.id)] = String(item.icon || '').trim()
                return result
            },
            {}
        )
        await uiedPageUpdateCategories({
            pageId: currentPageId.value,
            categoryIds: categorySelectedRows.value.map((item) => item.id),
            categoryIcons: categoryIconMap
        })
        feedback.msgSuccess('保存成功')
        showCategories.value = false
    } finally {
        categoryLoading.value = false
    }
}

/**
 * 行内快捷保存排序，降低页面管理维护成本。
 */
const handleQuickSortSave = async (row: any) => {
    const nextSort = Number(rowSortMap[row.id] ?? row.sortOrder ?? 0)
    if (!Number.isFinite(nextSort)) return
    if (Number(row.sortOrder || 0) === nextSort) return
    rowSortSavingMap[row.id] = true
    try {
        await uiedPageEdit({ id: row.id, sortOrder: nextSort })
        row.sortOrder = nextSort
        feedback.msgSuccess('排序已更新')
    } finally {
        rowSortSavingMap[row.id] = false
    }
}

watch(
    () => pager.lists,
    (rows) => {
        const rowList = Array.isArray(rows) ? rows : []
        rowList.forEach((item: any) => {
            rowSortMap[item.id] = Number(item.sortOrder || 0)
        })
    },
    { immediate: true, deep: true }
)

watch(
    () => editData.name,
    (value) => {
        if (editData.id) return
        if (slugTouched.value && String(editData.slug || '').trim()) return
        editData.slug = buildSlugFromName(String(value || ''))
    }
)

getLists()
</script>

<style scoped>
.input-w-80 {
    width: 80px;
}

.input-w-140 {
    width: 140px;
}

.input-w-220 {
    width: 220px;
}

.input-w-260 {
    width: 260px;
}

.input-w-320 {
    width: 320px;
}

.w-100 {
    width: 100%;
}

.scroll-websites-selector {
    width: 100%;
}

.category-add-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
}

.selected-websites-wrap {
    border: 1px solid var(--el-border-color-light);
    border-radius: 6px;
    padding: 12px;
    background: var(--el-fill-color-lighter);
}

.websites-count {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    margin-bottom: 8px;
}

.websites-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.website-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    background: var(--el-bg-color);
    border-radius: 4px;
    border: 1px solid var(--el-border-color-lighter);
    font-size: 13px;
    cursor: move;
    transition: all 0.2s;
}

.website-tag:hover {
    border-color: var(--el-color-primary-light-5);
    background: var(--el-color-primary-light-9);
}

.website-tag .website-icon {
    width: 16px;
    height: 16px;
    border-radius: 3px;
    object-fit: cover;
}

.website-tag .website-name {
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.website-tag .remove-icon {
    color: var(--el-text-color-placeholder);
    cursor: pointer;
    font-size: 12px;
}

.website-tag .remove-icon:hover {
    color: var(--el-color-danger);
}

.empty-tip {
    color: var(--el-text-color-placeholder);
    font-size: 13px;
}

.page-sort-cell {
    display: flex;
    align-items: center;
    gap: 4px;
}

.wp-taxonomy-config {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.wp-taxonomy-config__toolbar {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
}

.wp-taxonomy-config__hint {
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

.wp-taxonomy-config__hint code {
    font-size: 12px;
    color: var(--el-color-primary);
}

.wp-taxonomy-config__action-row {
    margin-bottom: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

.page-category-config {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 16px;
}

.page-category-config__panel {
    border: 1px solid var(--el-border-color-light);
    border-radius: 8px;
    padding: 12px;
    min-height: 420px;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.page-category-config__panel-title {
    font-size: 13px;
    color: var(--el-text-color-primary);
    font-weight: 600;
}

.page-category-config__panel-title--with-action {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.page-category-config__tree {
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 6px;
    padding: 8px;
    flex: 1;
    overflow: auto;
}

.page-category-config__empty {
    height: 100%;
    min-height: 220px;
    border: 1px dashed var(--el-border-color);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--el-text-color-secondary);
    font-size: 13px;
    padding: 12px;
    text-align: center;
}

.page-category-config__selected-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    overflow: auto;
}

.page-category-config__selected-item {
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    padding: 8px 10px;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
        'main actions'
        'editor editor';
    align-items: start;
    gap: 8px;
}

.page-category-config__selected-main {
    grid-area: main;
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    flex: 1;
}

.page-category-config__selected-index {
    min-width: 22px;
    height: 22px;
    border-radius: 999px;
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
}

.page-category-config__selected-name {
    font-size: 13px;
    color: var(--el-text-color-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.page-category-config__selected-icon-wrap {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: 1px solid var(--el-border-color-lighter);
    background: var(--el-fill-color-lighter);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--el-text-color-secondary);
    flex-shrink: 0;
}

.page-category-config__selected-icon {
    font-size: 14px;
}

.page-category-config__selected-icon--svg {
    width: 16px;
    height: 16px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.page-category-config__selected-icon--svg svg {
    width: 16px;
    height: 16px;
    display: block;
}

.page-category-config__selected-icon-empty {
    font-size: 10px;
}

.page-category-config__selected-icon-editor {
    grid-area: editor;
    min-width: 0;
    max-width: 100%;
    width: 100%;
    display: grid;
    gap: 6px;
}

.page-category-config__selected-icon-mode {
    width: fit-content;
}

.page-category-config__selected-icon-editor :deep(.el-input) {
    width: 100%;
}

.page-category-config__selected-icon-picker {
    width: 100%;
}

.page-category-config__selected-icon-picker :deep(.icon-select) {
    width: 100%;
}

.page-category-config__selected-icon-picker :deep(.el-input-group) {
    width: 100%;
}

.page-category-config__selected-svg-picker {
    width: 100%;
}

.page-category-config__selected-icon-tip {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    line-height: 1.35;
}

.page-category-config__selected-actions {
    grid-area: actions;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;
    justify-content: flex-end;
    align-self: center;
}

@media (max-width: 960px) {
    .page-category-config {
        grid-template-columns: 1fr;
    }
    .page-category-config__selected-item {
        grid-template-columns: 1fr;
        grid-template-areas:
            'main'
            'editor'
            'actions';
    }
    .page-category-config__selected-icon-editor {
        min-width: 100%;
        max-width: 100%;
    }
    .page-category-config__selected-actions {
        width: 100%;
        justify-content: flex-start;
    }
}
</style>
