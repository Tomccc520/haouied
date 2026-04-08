<!--
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-02-16
 */
-->
<template>
    <div class="material" v-loading="pager.loading">
        <div class="material__left">
            <div class="flex-1 min-h-0">
                <el-scrollbar>
                    <div class="material-left__content pt-4 p-b-4">
                        <div class="material-left__all-btn-wrap">
                            <el-button
                                class="material-left__all-btn"
                                :class="{ 'is-active': isAllCategorySelected }"
                                link
                                @click="handleSelectAllCategory"
                            >
                                {{ allCategoryButtonText }}
                            </el-button>
                        </div>
                        <el-tree
                            ref="treeRef"
                            node-key="id"
                            :data="cateLists"
                            empty-text=""
                            :highlight-current="true"
                            :expand-on-click-node="false"
                            :current-node-key="cateId"
                            @node-click="handleCatSelect"
                        >
                            <template v-slot="{ data }">
                                <div class="flex flex-1 items-center min-w-0 pr-4">
                                    <img
                                        class="w-[20px] h-[16px] mr-3"
                                        src="@/assets/images/icon_folder.png"
                                    />
                                    <span class="flex-1 truncate mr-2">
                                        <overflow-tooltip :content="data.name" />
                                    </span>
                                    <el-dropdown
                                        v-perms="[
                                            'common:album:cateRename',
                                            'common:album:cateDel'
                                        ]"
                                        v-if="data.id > 0"
                                        :hide-on-click="false"
                                    >
                                        <span class="muted m-r-10">···</span>
                                        <template #dropdown>
                                            <el-dropdown-menu>
                                                <popover-input
                                                    v-perms="['common:album:cateRename']"
                                                    @confirm="handleEditCate($event, data.id)"
                                                    size="default"
                                                    :value="data.name"
                                                    width="400px"
                                                    :limit="20"
                                                    show-limit
                                                    teleported
                                                >
                                                    <div>
                                                        <el-dropdown-item>
                                                            命名分组
                                                        </el-dropdown-item>
                                                    </div>
                                                </popover-input>
                                                <div
                                                    v-perms="['common:album:cateDel']"
                                                    @click="handleDeleteCate(data.id)"
                                                >
                                                    <el-dropdown-item>删除分组</el-dropdown-item>
                                                </div>
                                            </el-dropdown-menu>
                                        </template>
                                    </el-dropdown>
                                </div>
                            </template>
                        </el-tree>
                    </div>
                </el-scrollbar>
            </div>

            <div class="flex justify-center p-2 border-t border-br">
                <popover-input
                    v-perms="['common:album:cateAdd']"
                    @confirm="handleAddCate"
                    size="default"
                    width="400px"
                    :limit="20"
                    show-limit
                    teleported
                >
                    <el-button> 添加分组 </el-button>
                </popover-input>
            </div>
        </div>
        <div class="material__center flex flex-col">
            <div class="operate-btn flex">
                <div class="flex-1 flex">
                    <upload
                        v-if="type == 'image'"
                        v-perms="['common:upload:image']"
                        class="mr-3"
                        :data="{ cid: cateId }"
                        :type="type"
                        :show-progress="true"
                        @change="refresh"
                    >
                        <el-button type="primary">本地上传</el-button>
                    </upload>
                    <upload
                        v-if="type == 'video'"
                        v-perms="['common:upload:video']"
                        class="mr-3"
                        :data="{ cid: cateId }"
                        :type="type"
                        :show-progress="true"
                        @change="refresh"
                    >
                        <el-button type="primary">本地上传</el-button>
                    </upload>
                    <el-button
                        v-perms="['common:album:albumDel']"
                        v-if="mode == 'page'"
                        :disabled="!select.length"
                        @click.stop="batchFileDelete()"
                    >
                        删除
                    </el-button>

                    <popup
                        v-perms="['common:album:albumMove']"
                        v-if="mode == 'page'"
                        class="ml-3"
                        @confirm="batchFileMove"
                        :disabled="!select.length"
                        title="移动文件"
                    >
                        <template #trigger>
                            <el-button :disabled="!select.length">移动</el-button>
                        </template>

                        <div>
                            <span class="mr-5">移动文件至</span>
                            <el-select v-model="moveId" placeholder="请选择">
                                <template v-for="item in cateLists" :key="item.id">
                                    <el-option
                                        v-if="item.id !== ''"
                                        :label="item.name"
                                        :value="item.id"
                                    ></el-option>
                                </template>
                            </el-select>
                        </div>
                    </popup>
                    <el-button
                        v-if="mode == 'page' && type === 'image'"
                        v-perms="['common:album:albumRecompress']"
                        class="ml-3"
                        :loading="batchRecompressLoading"
                        :disabled="!select.length"
                        @click="handleBatchRecompress"
                    >
                        批量压缩
                    </el-button>
                    <el-button
                        v-if="mode == 'page' && type === 'image'"
                        v-perms="['uied:setting:get']"
                        class="ml-3"
                        :loading="compressConfigLoading"
                        @click="handleOpenCompressConfig"
                    >
                        压缩设置
                    </el-button>
                    <el-button
                        v-if="mode == 'page' && type === 'image'"
                        v-perms="['common:album:albumAdd']"
                        class="ml-3"
                        :loading="syncLocalLoading"
                        @click="handleSyncLocalUploads"
                    >
                        同步本地图片
                    </el-button>
                </div>
                <el-input
                    class="w-60"
                    placeholder="请输入名称"
                    v-model="fileParams.name"
                    @keyup.enter="refresh"
                >
                    <template #append>
                        <el-button @click="refresh">
                            <template #icon>
                                <icon name="el-icon-Search" />
                            </template>
                        </el-button>
                    </template>
                </el-input>
                <div class="flex items-center ml-2">
                    <el-tooltip content="列表视图" placement="top">
                        <div
                            class="list-icon"
                            :class="{
                                select: listShowType == 'table'
                            }"
                            @click="listShowType = 'table'"
                        >
                            <icon name="local-icon-list-2" :size="18" />
                        </div>
                    </el-tooltip>
                    <el-tooltip content="平铺视图" placement="top">
                        <div
                            class="list-icon"
                            :class="{
                                select: listShowType == 'normal'
                            }"
                            @click="listShowType = 'normal'"
                        >
                            <icon name="el-icon-Menu" :size="18" />
                        </div>
                    </el-tooltip>
                </div>
            </div>
            <div class="mt-3" v-if="mode == 'page'">
                <el-checkbox
                    :disabled="!pager.lists.length"
                    v-model="isCheckAll"
                    @change="selectAll"
                    :indeterminate="isIndeterminate"
                >
                    当页全选
                </el-checkbox>
            </div>
            <div class="material-center__content flex flex-col flex-1 mb-1 min-h-0">
                <div v-if="canViewAll" class="mb-2">
                    <el-tag type="warning" effect="plain"
                        >管理员视图：可查看全部素材及上传者</el-tag
                    >
                </div>
                <el-scrollbar v-if="pager.lists.length" v-show="listShowType == 'normal'">
                    <ul class="file-list flex flex-wrap mt-4">
                        <li
                            class="file-item-wrap"
                            v-for="item in pager.lists"
                            :key="item.id"
                            :style="{ width: fileSize }"
                        >
                            <del-wrap @close="batchFileDelete([item.id])">
                                <file-item
                                    :uri="item.uri"
                                    :file-size="fileSize"
                                    :type="type"
                                    @click="handleSelectFile(item)"
                                >
                                    <div class="item-selected" v-if="isSelect(item.id)">
                                        <icon :size="24" name="el-icon-Check" color="#fff" />
                                    </div>
                                </file-item>
                            </del-wrap>

                            <overflow-tooltip class="mt-1" :content="item.name" />
                            <div v-if="canViewUploader" class="text-xs text-info truncate">
                                上传者：{{ item.uploaderName || '-' }}
                            </div>
                            <div class="operation-btns flex items-center">
                                <popover-input
                                    v-perms="['common:album:albumRename']"
                                    @confirm="handleFileRename($event, item.id)"
                                    size="default"
                                    :value="item.name"
                                    width="400px"
                                    :limit="50"
                                    show-limit
                                    teleported
                                >
                                    <el-button type="primary" link> 重命名 </el-button>
                                </popover-input>
                                <el-button type="primary" link @click="handlePreview(item.uri)">
                                    查看
                                </el-button>
                            </div>
                        </li>
                    </ul>
                </el-scrollbar>

                <el-table
                    ref="tableRef"
                    class="mt-4"
                    v-show="listShowType == 'table'"
                    :data="pager.lists"
                    width="100%"
                    height="100%"
                    size="large"
                    @row-click="handleSelectFile"
                >
                    <el-table-column width="55">
                        <template #default="{ row }">
                            <el-checkbox
                                :modelValue="isSelect(row.id)"
                                @change="handleSelectFile(row)"
                            />
                        </template>
                    </el-table-column>
                    <el-table-column label="图片" width="100">
                        <template #default="{ row }">
                            <file-item :uri="row.uri" file-size="50px" :type="type"></file-item>
                        </template>
                    </el-table-column>
                    <el-table-column label="名称" min-width="100" show-overflow-tooltip>
                        <template #default="{ row }">
                            <el-link @click.stop="handlePreview(row.uri)" :underline="false">
                                {{ row.name }}
                            </el-link>
                        </template>
                    </el-table-column>
                    <el-table-column prop="createTime" label="上传时间" min-width="100" />
                    <el-table-column v-if="canViewUploader" label="上传者" min-width="120">
                        <template #default="{ row }">
                            <span>{{ row.uploaderName || '-' }}</span>
                        </template>
                    </el-table-column>
                    <el-table-column label="操作" width="150" fixed="right">
                        <template #default="{ row }">
                            <div class="inline-block" v-perms="['common:album:albumRename']">
                                <popover-input
                                    @confirm="handleFileRename($event, row.id)"
                                    size="default"
                                    :value="row.name"
                                    width="400px"
                                    :limit="50"
                                    show-limit
                                    teleported
                                >
                                    <el-button type="primary" link> 重命名 </el-button>
                                </popover-input>
                            </div>
                            <div class="inline-block">
                                <el-button type="primary" link @click.stop="handlePreview(row.uri)">
                                    查看
                                </el-button>
                            </div>
                            <div class="inline-block" v-perms="['common:album:albumDel']">
                                <el-button
                                    type="primary"
                                    link
                                    @click.stop="batchFileDelete([row.id])"
                                >
                                    删除
                                </el-button>
                            </div>
                        </template>
                    </el-table-column>
                </el-table>

                <div
                    class="flex flex-1 justify-center items-center"
                    v-if="!pager.loading && !pager.lists.length"
                >
                    暂无数据~
                </div>
            </div>
            <div class="material-center__footer flex justify-between items-center mt-2">
                <div class="flex">
                    <template v-if="mode == 'page'">
                        <span class="mr-3">
                            <el-checkbox
                                :disabled="!pager.lists.length"
                                v-model="isCheckAll"
                                @change="selectAll"
                                :indeterminate="isIndeterminate"
                            >
                                当页全选
                            </el-checkbox>
                        </span>
                        <el-button
                            v-perms="['common:album:albumDel']"
                            :disabled="!select.length"
                            @click="batchFileDelete()"
                        >
                            删除
                        </el-button>
                        <popup
                            v-perms="['common:album:albumMove']"
                            class="ml-3 inline"
                            @confirm="batchFileMove"
                            :disabled="!select.length"
                            title="移动文件"
                        >
                            <template #trigger>
                                <el-button :disabled="!select.length">移动</el-button>
                            </template>

                            <div>
                                <span class="mr-5">移动文件至</span>
                                <el-select v-model="moveId" placeholder="请选择">
                                    <template v-for="item in cateLists" :key="item.id">
                                        <el-option
                                            v-if="item.id !== ''"
                                            :label="item.name"
                                            :value="item.id"
                                        ></el-option>
                                    </template>
                                </el-select>
                            </div>
                        </popup>
                    </template>
                </div>
                <pagination
                    v-model="pager"
                    @change="getFileList"
                    layout="total, prev, pager, next, jumper"
                />
            </div>
        </div>
        <div class="material__right" v-if="mode == 'picker'">
            <div class="flex justify-between p-2 flex-wrap">
                <div class="sm flex items-center">
                    已选择 {{ select.length }}
                    <span v-if="limit">/{{ limit }}</span>
                </div>
                <el-button type="primary" link @click="clearSelect">清空</el-button>
            </div>
            <div class="flex-1 min-h-0">
                <el-scrollbar class="ls-scrollbar">
                    <ul class="select-lists flex flex-col p-t-3">
                        <li class="mb-4" v-for="item in select" :key="item.id">
                            <div class="select-item">
                                <del-wrap @close="cancelSelete(item.id)">
                                    <file-item
                                        :uri="item.uri"
                                        file-size="100px"
                                        :type="type"
                                    ></file-item>
                                </del-wrap>
                            </div>
                        </li>
                    </ul>
                </el-scrollbar>
            </div>
        </div>
        <div class="material__right material__right--detail" v-if="mode == 'page'">
            <div class="material-detail__head">
                <h4 class="material-detail__title">媒体详情</h4>
            </div>
            <el-scrollbar class="material-detail__scroll">
                <div class="material-detail__body" v-if="selectedDetail">
                    <div class="material-detail__preview">
                        <img
                            v-if="type === 'image'"
                            class="material-detail__preview-image"
                            :src="selectedDetail.uri"
                            :alt="resolveAltText(selectedDetail)"
                        />
                        <file-item v-else :uri="selectedDetail.uri" file-size="100%" :type="type" />
                    </div>
                    <div class="material-detail__rows">
                        <div class="material-detail__row">
                            <span class="material-detail__label">上传于：</span>
                            <span class="material-detail__value">{{
                                formatUploadAt(selectedDetail.createTime)
                            }}</span>
                        </div>
                        <div class="material-detail__row">
                            <span class="material-detail__label">上传者：</span>
                            <span class="material-detail__value">{{
                                selectedDetail.uploaderName || '-'
                            }}</span>
                        </div>
                        <div class="material-detail__row">
                            <span class="material-detail__label">上传至：</span>
                            <span class="material-detail__value">{{
                                resolveUploadTarget(selectedDetail)
                            }}</span>
                        </div>
                        <div class="material-detail__row">
                            <span class="material-detail__label">文件名：</span>
                            <span class="material-detail__value">{{
                                resolveFileName(selectedDetail)
                            }}</span>
                        </div>
                        <div class="material-detail__row">
                            <span class="material-detail__label">文件类型：</span>
                            <span class="material-detail__value">{{
                                resolveFileTypeLabel(selectedDetail)
                            }}</span>
                        </div>
                        <div class="material-detail__row">
                            <span class="material-detail__label">文件大小：</span>
                            <span class="material-detail__value">{{
                                resolveFileSizeLabel(selectedDetail)
                            }}</span>
                        </div>
                        <div class="material-detail__row">
                            <span class="material-detail__label">分辨率：</span>
                            <span class="material-detail__value">{{ resolutionText }}</span>
                        </div>
                        <div class="material-detail__row" v-if="type === 'image'">
                            <span class="material-detail__label">引用状态：</span>
                            <span class="material-detail__value">{{ usageSummaryText }}</span>
                        </div>
                        <div
                            class="material-detail__row material-detail__row--block"
                            v-if="type === 'image'"
                        >
                            <span class="material-detail__label">引用明细：</span>
                            <div class="material-detail__value material-detail__value--full">
                                <el-button
                                    type="primary"
                                    link
                                    v-perms="['common:album:albumUsageDetail']"
                                    :loading="usageLoading"
                                    @click="loadSelectedUsageDetail(true)"
                                >
                                    刷新引用
                                </el-button>
                                <div class="material-detail__usage-list" v-if="usageList.length">
                                    <div
                                        class="material-detail__usage-item"
                                        v-for="item in usageList"
                                        :key="`${item.scope}-${item.id}`"
                                    >
                                        <span class="material-detail__usage-scope">{{
                                            item.scope
                                        }}</span>
                                        <span class="material-detail__usage-title">{{
                                            item.title
                                        }}</span>
                                    </div>
                                </div>
                                <div v-else class="material-detail__usage-empty">暂无引用记录</div>
                            </div>
                        </div>
                        <div
                            class="material-detail__row material-detail__row--actions"
                            v-if="type === 'image'"
                        >
                            <el-button
                                type="success"
                                size="small"
                                v-perms="['common:album:albumRecompress']"
                                :loading="recompressLoading"
                                @click="handleRecompressSelected"
                            >
                                重压缩当前图片
                            </el-button>
                        </div>
                        <div
                            class="material-detail__row"
                            v-if="type === 'image' && recompressHintText"
                        >
                            <span class="material-detail__label">压缩结果：</span>
                            <span class="material-detail__value">{{ recompressHintText }}</span>
                        </div>
                        <div class="material-detail__row">
                            <span class="material-detail__label">替代文本：</span>
                            <div class="material-detail__value material-detail__value--full">
                                <el-input
                                    v-model="detailForm.alt"
                                    size="small"
                                    placeholder="描述此图片的用途（装饰图可留空）"
                                    maxlength="255"
                                    show-word-limit
                                />
                            </div>
                        </div>
                        <div class="material-detail__row">
                            <span class="material-detail__label">标题：</span>
                            <div class="material-detail__value material-detail__value--full">
                                <el-input
                                    v-model="detailForm.title"
                                    size="small"
                                    placeholder="媒体标题"
                                    maxlength="255"
                                    show-word-limit
                                />
                            </div>
                        </div>
                        <div class="material-detail__row material-detail__row--block">
                            <span class="material-detail__label">说明文字：</span>
                            <div class="material-detail__value material-detail__value--full">
                                <el-input
                                    v-model="detailForm.caption"
                                    type="textarea"
                                    :rows="2"
                                    placeholder="可选：简短说明"
                                    maxlength="255"
                                    show-word-limit
                                />
                            </div>
                        </div>
                        <div class="material-detail__row">
                            <span class="material-detail__label">描述：</span>
                            <div class="material-detail__value material-detail__value--full">
                                <el-input
                                    v-model="detailForm.description"
                                    type="textarea"
                                    :rows="3"
                                    placeholder="可选：更完整的描述"
                                    maxlength="4000"
                                    show-word-limit
                                />
                            </div>
                        </div>
                        <div class="material-detail__row material-detail__row--actions">
                            <el-button
                                type="primary"
                                size="small"
                                :loading="metaSaving"
                                @click="handleSaveSelectedMeta"
                            >
                                保存媒体信息
                            </el-button>
                        </div>
                        <div class="material-detail__row material-detail__row--block">
                            <span class="material-detail__label">文件 URL：</span>
                            <el-input
                                readonly
                                :model-value="String(selectedDetail.uri || '')"
                                size="small"
                            />
                            <el-button class="mt-2" size="small" @click="handleCopySelectedFileUrl">
                                复制网址至剪贴板
                            </el-button>
                        </div>
                    </div>
                </div>
                <div class="material-detail__empty" v-else>请选择一张素材以查看参数</div>
            </el-scrollbar>
        </div>
        <preview v-model="showPreview" :url="previewUrl" :type="type" />
        <el-dialog
            v-model="compressConfigVisible"
            title="素材图片压缩配置"
            width="620px"
            destroy-on-close
        >
            <el-form
                v-loading="compressConfigLoading"
                :model="compressConfigForm"
                label-width="180px"
                class="material-compress-config-form"
            >
                <el-form-item label="启用图片压缩">
                    <el-switch v-model="compressConfigForm.enabled" />
                </el-form-item>
                <el-form-item label="本地上传启用">
                    <el-switch
                        v-model="compressConfigForm.applyOnLocalUpload"
                        :disabled="!compressConfigForm.enabled"
                    />
                </el-form-item>
                <el-form-item label="远程转存启用">
                    <el-switch
                        v-model="compressConfigForm.applyOnRemoteTransfer"
                        :disabled="!compressConfigForm.enabled"
                    />
                </el-form-item>
                <el-form-item label="远程附件文件名结构">
                    <div class="w-full">
                        <el-input
                            v-model="compressConfigForm.remoteNamePattern"
                            :disabled="!compressConfigForm.enabled"
                            placeholder="%random%-%date%"
                        />
                        <div class="material-compress-token-tips mt-2">
                            <span>%filename%</span>
                            <span>%date%</span>
                            <span>%year%</span>
                            <span>%month%</span>
                            <span>%day%</span>
                            <span>%time%</span>
                            <span>%timestamp%</span>
                            <span>%md5%</span>
                            <span>%random%</span>
                        </div>
                    </div>
                </el-form-item>
                <el-form-item label="最小压缩阈值（KB）">
                    <el-input-number
                        v-model="compressConfigForm.minSizeKb"
                        :min="0"
                        :max="51200"
                        :step="10"
                        :disabled="!compressConfigForm.enabled"
                    />
                </el-form-item>
                <el-form-item label="最大宽度（px）">
                    <el-input-number
                        v-model="compressConfigForm.maxWidth"
                        :min="0"
                        :max="8192"
                        :step="10"
                        :disabled="!compressConfigForm.enabled"
                    />
                </el-form-item>
                <el-form-item label="最大高度（px）">
                    <el-input-number
                        v-model="compressConfigForm.maxHeight"
                        :min="0"
                        :max="8192"
                        :step="10"
                        :disabled="!compressConfigForm.enabled"
                    />
                </el-form-item>
                <el-form-item label="JPG质量（40-100）">
                    <el-input-number
                        v-model="compressConfigForm.jpegQuality"
                        :min="40"
                        :max="100"
                        :step="1"
                        :disabled="!compressConfigForm.enabled"
                    />
                </el-form-item>
                <el-form-item label="PNG压缩级别（0-9）">
                    <el-input-number
                        v-model="compressConfigForm.pngCompressionLevel"
                        :min="0"
                        :max="9"
                        :step="1"
                        :disabled="!compressConfigForm.enabled"
                    />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="compressConfigVisible = false">取消</el-button>
                <el-button
                    type="primary"
                    :loading="compressConfigSaving"
                    @click="handleSaveCompressConfig"
                >
                    保存配置
                </el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script lang="ts" setup>
import { useCate, useFile } from './hook'
import FileItem from './file.vue'
import Preview from './preview.vue'
import { fileMetaUpdate, fileUsageDetail, fileRecompress, fileSyncLocalUploads } from '@/api/file'
import { uiedSettingGet, uiedSettingSave } from '@/api/uied'
import dayjs from 'dayjs'
import feedback from '@/utils/feedback'
import type { Ref } from 'vue'
const props = defineProps({
    fileSize: {
        type: String,
        default: '100px'
    },
    limit: {
        type: Number,
        default: 1
    },
    type: {
        type: String,
        default: 'image'
    },
    mode: {
        type: String,
        default: 'picker'
    },
    pageSize: {
        type: Number,
        default: 15
    }
})
const emit = defineEmits(['change'])
const { limit } = toRefs(props)
const typeValue = computed<number>(() => {
    switch (props.type) {
        case 'image':
            return 10
        case 'video':
            return 20
        case 'file':
            return 30
        default:
            return 0
    }
})
const visible: Ref<boolean> = inject('visible')!
const previewUrl = ref('')
const showPreview = ref(false)
const activeFile = ref<Record<string, any> | null>(null)
const metaSaving = ref(false)
const compressConfigVisible = ref(false)
const compressConfigLoading = ref(false)
const compressConfigSaving = ref(false)
const recompressLoading = ref(false)
const batchRecompressLoading = ref(false)
const syncLocalLoading = ref(false)
const usageLoading = ref(false)
const usageLoadedAlbumId = ref(0)
const usageList = ref<Array<{ scope: string; id: number; title: string }>>([])
const usageErrorText = ref('')
const recompressHintText = ref('')
const detailForm = reactive({
    alt: '',
    title: '',
    caption: '',
    description: ''
})
const defaultCompressConfig = {
    enabled: false,
    applyOnLocalUpload: true,
    applyOnRemoteTransfer: true,
    remoteNamePattern: '%random%-%date%',
    minSizeKb: 200,
    maxWidth: 2560,
    maxHeight: 2560,
    jpegQuality: 82,
    pngCompressionLevel: 9
}
const compressConfigForm = reactive({ ...defaultCompressConfig })
const imageResolution = reactive({
    width: 0,
    height: 0,
    loading: false
})
const isAllCategorySelected = computed(() => String(cateId.value || '') === '')
const allCategoryButtonText = computed(() => {
    if (props.type === 'image') return '全部图片'
    if (props.type === 'video') return '全部视频'
    return '全部素材'
})
const {
    treeRef,
    cateId,
    cateLists,
    handleAddCate,
    handleEditCate,
    handleDeleteCate,
    getCateLists,
    handleCatSelect
} = useCate(typeValue.value)

const {
    tableRef,
    listShowType,
    moveId,
    pager,
    fileParams,
    select,
    isCheckAll,
    isIndeterminate,
    canViewUploader,
    canViewAll,
    getFileList,
    refresh,
    batchFileDelete,
    batchFileMove,
    selectFile,
    isSelect,
    clearSelect,
    cancelSelete,
    selectAll,
    handleFileRename
} = useFile(cateId, typeValue, limit, props.pageSize)

/**
 * 选择默认“全部素材”分类
 */
const handleSelectAllCategory = () => {
    cateId.value = ''
    treeRef.value?.setCurrentKey()
}

const getData = async () => {
    await getCateLists()
    treeRef.value?.setCurrentKey(cateId.value)
    getFileList()
}

const handlePreview = (url: string) => {
    previewUrl.value = url
    showPreview.value = true
}

/**
 * 处理素材选中并同步右侧详情面板。
 */
const handleSelectFile = (item: any) => {
    if (!item || typeof item !== 'object') return
    selectFile(item)
    activeFile.value = item
}

/**
 * 当前详情面板展示的素材项。
 */
const selectedDetail = computed(() => {
    const id = Number(activeFile.value?.id || 0)
    if (id > 0) {
        const matched = (Array.isArray(pager.lists) ? pager.lists : []).find(
            (row: any) => Number(row?.id || 0) === id
        )
        if (matched) return matched
    }
    return Array.isArray(select.value) && select.value.length ? select.value[0] : null
})

/**
 * 将当前选中素材的元数据回填到编辑表单。
 */
const syncDetailForm = (item: any) => {
    detailForm.alt = String(item?.alt || '').trim()
    detailForm.title = String(item?.title || '').trim()
    detailForm.caption = String(item?.caption || '').trim()
    detailForm.description = String(item?.description || '').trim()
}

/**
 * 把元数据变更同步回当前列表缓存，避免保存后需要手动刷新。
 */
const patchLocalDetailMeta = (id: number, payload: Record<string, string>) => {
    if (!id) return
    const applyPatch = (row: any) => {
        if (Number(row?.id || 0) !== id) return
        row.alt = payload.alt
        row.title = payload.title
        row.caption = payload.caption
        row.description = payload.description
    }
    ;(Array.isArray(pager.lists) ? pager.lists : []).forEach(applyPatch)
    ;(Array.isArray(select.value) ? select.value : []).forEach(applyPatch)
    if (Number(activeFile.value?.id || 0) === id) {
        Object.assign(activeFile.value || {}, payload)
    }
}

/**
 * 保存当前素材元数据。
 */
const handleSaveSelectedMeta = async () => {
    const id = Number(selectedDetail.value?.id || 0)
    if (!id) {
        feedback.msgWarning('请先选择一个素材')
        return
    }
    const payload = {
        alt: String(detailForm.alt || '').trim(),
        title: String(detailForm.title || '').trim(),
        caption: String(detailForm.caption || '').trim(),
        description: String(detailForm.description || '').trim()
    }
    metaSaving.value = true
    try {
        await fileMetaUpdate({
            id,
            ...payload
        })
        patchLocalDetailMeta(id, payload)
        feedback.msgSuccess('媒体信息保存成功')
    } finally {
        metaSaving.value = false
    }
}

/**
 * 规范化压缩配置表单，统一数值范围并兜底默认值。
 */
const normalizeCompressConfigForm = (raw: any) => {
    const source = raw && typeof raw === 'object' ? raw : {}
    const clampInt = (value: any, min: number, max: number, fallback: number) => {
        const parsed = Number.parseInt(String(value ?? ''), 10)
        if (!Number.isFinite(parsed)) return fallback
        return Math.min(max, Math.max(min, parsed))
    }
    return {
        enabled: source.enabled === true,
        applyOnLocalUpload: source.applyOnLocalUpload !== false,
        applyOnRemoteTransfer: source.applyOnRemoteTransfer !== false,
        remoteNamePattern:
            String(source.remoteNamePattern || defaultCompressConfig.remoteNamePattern)
                .trim()
                .slice(0, 120) || defaultCompressConfig.remoteNamePattern,
        minSizeKb: clampInt(source.minSizeKb, 0, 51200, defaultCompressConfig.minSizeKb),
        maxWidth: clampInt(source.maxWidth, 0, 8192, defaultCompressConfig.maxWidth),
        maxHeight: clampInt(source.maxHeight, 0, 8192, defaultCompressConfig.maxHeight),
        jpegQuality: clampInt(source.jpegQuality, 40, 100, defaultCompressConfig.jpegQuality),
        pngCompressionLevel: clampInt(
            source.pngCompressionLevel,
            0,
            9,
            defaultCompressConfig.pngCompressionLevel
        )
    }
}

/**
 * 拉取后台素材压缩配置。
 */
const loadCompressConfig = async () => {
    compressConfigLoading.value = true
    try {
        const data = await uiedSettingGet({ key: 'materialUploadConfig' })
        Object.assign(
            compressConfigForm,
            normalizeCompressConfigForm(data || defaultCompressConfig)
        )
    } catch (error: any) {
        Object.assign(compressConfigForm, { ...defaultCompressConfig })
        feedback.msgWarning(String(error?.message || '压缩配置读取失败，已使用默认值'))
    } finally {
        compressConfigLoading.value = false
    }
}

/**
 * 打开素材压缩配置弹窗。
 */
const handleOpenCompressConfig = async () => {
    compressConfigVisible.value = true
    await loadCompressConfig()
}

/**
 * 保存素材压缩配置到后台。
 */
const handleSaveCompressConfig = async () => {
    compressConfigSaving.value = true
    try {
        const payload = normalizeCompressConfigForm(compressConfigForm)
        await uiedSettingSave({
            materialUploadConfig: payload
        })
        Object.assign(compressConfigForm, payload)
        feedback.msgSuccess('图片压缩配置已保存')
        compressConfigVisible.value = false
    } catch (error: any) {
        feedback.msgWarning(String(error?.message || '保存压缩配置失败'))
    } finally {
        compressConfigSaving.value = false
    }
}

/**
 * 查询当前素材引用明细（文章/网址），用于运营排查。
 */
const loadSelectedUsageDetail = async (force = false) => {
    const albumId = Number(selectedDetail.value?.id || 0)
    if (!albumId) {
        usageLoadedAlbumId.value = 0
        usageList.value = []
        usageErrorText.value = ''
        return
    }
    if (!force && usageLoadedAlbumId.value === albumId) return
    usageLoading.value = true
    usageErrorText.value = ''
    try {
        const data = await fileUsageDetail({ id: albumId })
        usageLoadedAlbumId.value = albumId
        usageList.value = Array.isArray(data?.items) ? data.items : []
    } catch (error: any) {
        usageLoadedAlbumId.value = albumId
        usageList.value = []
        usageErrorText.value = String(error?.message || '引用查询失败')
    } finally {
        usageLoading.value = false
    }
}

/**
 * 引用明细统计文本。
 */
const usageSummaryText = computed(() => {
    if (usageLoading.value) return '引用检测中...'
    if (usageErrorText.value) return usageErrorText.value
    if (!usageList.value.length) return '未发现引用'
    return `已引用 ${usageList.value.length} 处`
})

/**
 * 执行素材重压缩并给出操作反馈。
 */
const runRecompress = async (ids: number[]) => {
    const result = await fileRecompress({ ids })
    const successCount = Number(result?.success?.length || 0)
    const skippedCount = Number(result?.skipped?.length || 0)
    const failedCount = Number(result?.failed?.length || 0)
    const savedBytes = (Array.isArray(result?.success) ? result.success : []).reduce(
        (sum: number, item: any) => sum + Number(item?.savedBytes || 0),
        0
    )
    const savedKb = (savedBytes / 1024).toFixed(2)
    const hint = `成功 ${successCount}，跳过 ${skippedCount}，失败 ${failedCount}，总计减少 ${savedKb} KB`
    recompressHintText.value = hint
    if (failedCount > 0) {
        feedback.msgWarning(`压缩完成（含失败）：${hint}`)
    } else {
        feedback.msgSuccess(`压缩完成：${hint}`)
    }
    return result
}

/**
 * 重压缩当前选中素材。
 */
const handleRecompressSelected = async () => {
    const albumId = Number(selectedDetail.value?.id || 0)
    if (!albumId) {
        feedback.msgWarning('请先选择一个素材')
        return
    }
    recompressLoading.value = true
    try {
        await runRecompress([albumId])
        await getFileList()
        await loadSelectedUsageDetail(true)
    } finally {
        recompressLoading.value = false
    }
}

/**
 * 对当前已选素材执行批量压缩。
 */
const handleBatchRecompress = async () => {
    const ids = (Array.isArray(select.value) ? select.value : [])
        .map((item: any) => Number(item?.id || 0))
        .filter((id: number) => id > 0)
    if (!ids.length) {
        feedback.msgWarning('请先选择需要压缩的图片')
        return
    }
    await feedback.confirm(`确认压缩已选 ${ids.length} 张图片？`)
    batchRecompressLoading.value = true
    try {
        await runRecompress(ids)
        await getFileList()
        await loadSelectedUsageDetail(true)
    } finally {
        batchRecompressLoading.value = false
    }
}

/**
 * 同步服务端 uploads/image 历史文件到素材库，便于统一压缩与管理。
 */
const handleSyncLocalUploads = async () => {
    await feedback.confirm('确认同步本地 uploads/image 下的历史图片到素材库？')
    syncLocalLoading.value = true
    try {
        const data = await fileSyncLocalUploads({
            cid: Number(cateId.value || 0) || 0
        })
        const imported = Number(data?.imported || 0)
        const restored = Number(data?.restored || 0)
        const deletedMatched = Number(data?.deletedMatched || 0)
        const existed = Number(data?.existed || 0)
        const skipped = Number(data?.skipped || 0)
        feedback.msgSuccess(
            `同步完成：新增 ${imported}，恢复 ${restored}，历史已删除 ${deletedMatched}，已存在 ${existed}，跳过 ${skipped}`
        )
        await getFileList()
    } finally {
        syncLocalLoading.value = false
    }
}

/**
 * 递归查找素材分类名称。
 */
const findCateNameById = (id: number, nodes: any[] = []): string => {
    for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i] || {}
        if (Number(node.id || 0) === id) return String(node.name || '').trim()
        const children = Array.isArray(node.children) ? node.children : []
        const childName = findCateNameById(id, children)
        if (childName) return childName
    }
    return ''
}

/**
 * 格式化上传时间为中文展示。
 */
const formatUploadAt = (value: any) => {
    const text = String(value || '').trim()
    if (!text) return '-'
    const date = dayjs(text)
    if (!date.isValid()) return text
    return date.format('YYYY年M月D日 HH:mm:ss')
}

/**
 * 解析素材归属分组名称。
 */
const resolveUploadTarget = (item: any) => {
    const cid = Number(item?.cid || 0)
    if (!cid) return '未分组'
    const name = findCateNameById(cid, Array.isArray(cateLists.value) ? cateLists.value : [])
    return name || `分组#${cid}`
}

/**
 * 获取素材文件名（优先素材名称）。
 */
const resolveFileName = (item: any) => {
    const name = String(item?.name || '').trim()
    if (name) return name
    const uri = String(item?.uri || '').trim()
    const pathPart = uri.split('?')[0]
    const lastSeg = pathPart.split('/').pop() || ''
    return decodeURIComponent(lastSeg || '-') || '-'
}

/**
 * 解析文件类型为 MIME 展示文本。
 */
const resolveFileTypeLabel = (item: any) => {
    const ext = String(item?.fileType || item?.ext || '')
        .trim()
        .toLowerCase()
    const extMap: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        svg: 'image/svg+xml',
        bmp: 'image/bmp',
        ico: 'image/x-icon',
        mp4: 'video/mp4',
        mov: 'video/quicktime',
        webm: 'video/webm'
    }
    if (extMap[ext]) return extMap[ext]
    if (ext) {
        if (props.type === 'video') return `video/${ext}`
        return `image/${ext}`
    }
    return '-'
}

/**
 * 格式化文件大小显示（兼容后端已格式化与字节数）。
 */
const resolveFileSizeLabel = (item: any) => {
    const formatted = String(item?.size || '').trim()
    if (formatted) return formatted
    const bytes = Number(item?.sizeBytes || 0)
    if (!Number.isFinite(bytes) || bytes <= 0) return '-'
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/**
 * 读取素材的替代文本。
 */
const resolveAltText = (item: any) => String(item?.alt || '').trim()

/**
 * 读取当前图片分辨率（通过图片实际加载获取）。
 */
const loadResolutionByUri = (uri: string) =>
    new Promise<{ width: number; height: number }>((resolve) => {
        if (!uri || typeof window === 'undefined') {
            resolve({ width: 0, height: 0 })
            return
        }
        const image = new Image()
        image.onload = () =>
            resolve({ width: image.naturalWidth || 0, height: image.naturalHeight || 0 })
        image.onerror = () => resolve({ width: 0, height: 0 })
        image.src = uri
    })

/**
 * 复制文本到剪贴板（兼容旧浏览器）。
 */
const copyText = async (text: string) => {
    if (!text) return false
    if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text)
        return true
    }
    const textarea = document.createElement('textarea')
    textarea.value = text
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.focus()
    textarea.select()
    const copied = document.execCommand('copy')
    document.body.removeChild(textarea)
    return copied
}

/**
 * 复制当前素材 URL。
 */
const handleCopySelectedFileUrl = async () => {
    const url = String(selectedDetail.value?.uri || '').trim()
    if (!url) {
        feedback.msgWarning('当前素材缺少 URL')
        return
    }
    const ok = await copyText(url)
    if (ok) {
        feedback.msgSuccess('素材 URL 已复制')
    } else {
        feedback.msgWarning('复制失败，请手动复制')
    }
}

/**
 * 分辨率展示文本。
 */
const resolutionText = computed(() => {
    if (props.type !== 'image') return '-'
    const width = Number(selectedDetail.value?.width || imageResolution.width || 0)
    const height = Number(selectedDetail.value?.height || imageResolution.height || 0)
    if (width > 0 && height > 0) return `${width} × ${height} 像素`
    if (imageResolution.loading) return '读取中...'
    return '-'
})
watch(
    visible,
    async (val: boolean) => {
        if (val) {
            getData()
        }
    },
    {
        immediate: true
    }
)
watch(cateId, () => {
    fileParams.name = ''
    refresh()
    activeFile.value = null
    usageLoadedAlbumId.value = 0
    usageList.value = []
    usageErrorText.value = ''
})

watch(
    () => selectedDetail.value?.id,
    async () => {
        syncDetailForm(selectedDetail.value)
        recompressHintText.value = ''
        await loadSelectedUsageDetail(true)
    },
    {
        immediate: true
    }
)

watch(
    select,
    (val: any[]) => {
        emit('change', val)
        if (val.length == pager.lists.length && val.length !== 0) {
            isIndeterminate.value = false
            isCheckAll.value = true
            return
        }
        if (val.length > 0) {
            isIndeterminate.value = true
        } else {
            isCheckAll.value = false
            isIndeterminate.value = false
        }
    },
    {
        deep: true
    }
)

onMounted(() => {
    if (props.mode === 'page') {
        getData()
    }
})

watch(
    () => selectedDetail.value?.uri,
    async (uri) => {
        if (props.type !== 'image') {
            imageResolution.width = 0
            imageResolution.height = 0
            imageResolution.loading = false
            return
        }
        const link = String(uri || '').trim()
        if (!link) {
            imageResolution.width = 0
            imageResolution.height = 0
            imageResolution.loading = false
            return
        }
        imageResolution.loading = true
        const result = await loadResolutionByUri(link)
        imageResolution.width = Number(result.width || 0)
        imageResolution.height = Number(result.height || 0)
        imageResolution.loading = false
    },
    {
        immediate: true
    }
)

defineExpose({
    clearSelect
})
</script>

<style scoped lang="scss">
.material {
    @apply h-full min-h-0 flex flex-1;
    &__left {
        @apply border-r border-br flex flex-col w-[200px];
        :deep(.el-tree-node__content) {
            height: 36px;
        }
        .material-left__all-btn-wrap {
            padding: 0 12px 8px;
        }
        .material-left__all-btn {
            width: 100%;
            justify-content: flex-start;
            color: var(--el-text-color-regular);
        }
        .material-left__all-btn.is-active {
            color: var(--el-color-primary);
            font-weight: 600;
        }
    }
    &__center {
        flex: 1;
        min-width: 0;
        min-height: 0;
        padding: 16px 16px 0;
        .list-icon {
            border-radius: 3px;
            display: flex;
            padding: 5px;
            cursor: pointer;
            &.select {
                @apply text-primary bg-primary-light-8;
            }
        }
        .file-list {
            .file-item-wrap {
                margin-right: 16px;
                line-height: 1.3;
                cursor: pointer;
                .item-selected {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    border-radius: 4px;
                    background-color: rgba(0, 0, 0, 0.5);
                    box-sizing: border-box;
                }
                .operation-btns {
                    height: 28px;
                    visibility: hidden;
                }
                &:hover .operation-btns {
                    visibility: visible;
                }
            }
        }
    }
    &__right {
        @apply border-l border-br flex flex-col;
        width: 130px;
        .select-lists {
            padding: 10px;

            .select-item {
                width: 100px;
                height: 100px;
            }
        }
    }
    &__right--detail {
        width: 340px;
        .material-detail__head {
            padding: 12px 12px 0;
            border-bottom: 1px solid var(--el-border-color-light);
        }
        .material-detail__title {
            margin: 0 0 12px;
            font-size: 14px;
            font-weight: 600;
            color: var(--el-text-color-primary);
        }
        .material-detail__scroll {
            flex: 1;
            min-height: 0;
        }
        .material-detail__body {
            padding: 12px;
        }
        .material-detail__preview {
            width: 100%;
            border: 1px solid var(--el-border-color-lighter);
            border-radius: 8px;
            overflow: hidden;
            background: #f8fafc;
            margin-bottom: 12px;
        }
        .material-detail__preview-image {
            width: 100%;
            max-height: 180px;
            object-fit: contain;
            display: block;
            background: #f8fafc;
        }
        .material-detail__rows {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        .material-detail__row {
            display: flex;
            align-items: flex-start;
            font-size: 13px;
            line-height: 1.5;
            color: var(--el-text-color-primary);
            word-break: break-word;
        }
        .material-detail__row--block {
            display: block;
        }
        .material-detail__row--actions {
            justify-content: flex-end;
            padding-top: 4px;
        }
        .material-detail__label {
            flex-shrink: 0;
            color: var(--el-text-color-secondary);
        }
        .material-detail__value {
            color: var(--el-text-color-primary);
        }
        .material-detail__value--full {
            flex: 1;
            min-width: 0;
        }
        .material-detail__usage-list {
            display: flex;
            flex-direction: column;
            gap: 6px;
            margin-top: 4px;
        }
        .material-detail__usage-item {
            display: flex;
            gap: 6px;
            font-size: 12px;
            line-height: 1.4;
        }
        .material-detail__usage-scope {
            flex-shrink: 0;
            color: var(--el-color-primary);
            font-weight: 500;
        }
        .material-detail__usage-title {
            color: var(--el-text-color-regular);
            word-break: break-all;
        }
        .material-detail__usage-empty {
            margin-top: 4px;
            font-size: 12px;
            color: var(--el-text-color-secondary);
        }
        .material-detail__empty {
            height: 100%;
            min-height: 180px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--el-text-color-secondary);
            font-size: 13px;
            padding: 12px;
        }
    }
}

.material-compress-config-form {
    :deep(.el-input-number) {
        width: 220px;
    }
}

.material-compress-token-tips {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    color: var(--el-text-color-secondary);
    font-size: 12px;
    line-height: 1.4;
}
</style>
