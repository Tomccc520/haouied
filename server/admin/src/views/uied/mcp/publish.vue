<!--
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-20
 */
-->
<template>
    <div class="mcp-publish-page" v-loading="pageLoading">
        <el-card class="!border-none" shadow="never">
            <template #header>
                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="mcp-publish-page__title">
                            {{ formData.id ? '编辑 MCP' : '发布 MCP' }}
                        </h2>
                        <p class="mcp-publish-page__desc">
                            支持草稿与发布双状态，并可配置 SEO、分类、标签、推荐位与排序。
                        </p>
                    </div>
                    <el-button @click="goBack">返回列表</el-button>
                </div>
            </template>

            <el-form
                ref="formRef"
                :model="formData"
                :rules="rules"
                label-width="120px"
                class="mcp-publish-page__form"
            >
                <el-divider content-position="left">基础信息</el-divider>
                <el-form-item label="名称" prop="name">
                    <el-input v-model="formData.name" placeholder="请输入 MCP 名称" />
                </el-form-item>
                <el-form-item label="URL标识" prop="slug">
                    <el-input
                        v-model="formData.slug"
                        placeholder="留空自动生成（建议英文短横线）"
                    />
                </el-form-item>
                <el-form-item label="摘要" prop="summary">
                    <el-input
                        v-model="formData.summary"
                        type="textarea"
                        :rows="3"
                        placeholder="用于列表摘要和 SEO 描述兜底"
                    />
                </el-form-item>
                <el-form-item label="正文内容" prop="content">
                    <el-input
                        v-model="formData.content"
                        type="textarea"
                        :rows="12"
                        placeholder="请输入 MCP 详细介绍（支持 HTML）"
                    />
                </el-form-item>
                <el-form-item label="图标URL">
                    <div class="mcp-publish-page__input-row">
                        <el-input v-model="formData.iconUrl" placeholder="图标 URL" />
                        <material-picker v-model="formData.iconUrl" :limit="1">
                            <el-button>素材中心</el-button>
                        </material-picker>
                    </div>
                </el-form-item>
                <el-form-item label="封面URL">
                    <div class="mcp-publish-page__input-row">
                        <el-input v-model="formData.coverUrl" placeholder="封面 URL" />
                        <material-picker v-model="formData.coverUrl" :limit="1">
                            <el-button>素材中心</el-button>
                        </material-picker>
                    </div>
                </el-form-item>
                <el-form-item label="官网链接" prop="officialUrl">
                    <el-input v-model="formData.officialUrl" placeholder="https://" />
                </el-form-item>
                <el-form-item label="文档链接">
                    <el-input v-model="formData.docsUrl" placeholder="https://" />
                </el-form-item>
                <el-form-item label="GitHub链接">
                    <el-input v-model="formData.githubUrl" placeholder="https://github.com/..." />
                </el-form-item>

                <el-divider content-position="left">协议与归类</el-divider>
                <el-form-item label="传输协议">
                    <el-radio-group v-model="formData.transportType">
                        <el-radio-button label="http">HTTP</el-radio-button>
                        <el-radio-button label="sse">SSE</el-radio-button>
                        <el-radio-button label="stdio">STDIO</el-radio-button>
                    </el-radio-group>
                </el-form-item>
                <el-form-item label="运行时">
                    <el-radio-group v-model="formData.runtime">
                        <el-radio-button label="node">Node</el-radio-button>
                        <el-radio-button label="python">Python</el-radio-button>
                        <el-radio-button label="go">Go</el-radio-button>
                        <el-radio-button label="other">其他</el-radio-button>
                    </el-radio-group>
                </el-form-item>
                <el-form-item label="协议版本">
                    <el-input v-model="formData.protocolVersion" placeholder="例如：2025-03-26" />
                </el-form-item>
                <el-form-item label="所属分类">
                    <el-select
                        v-model="formData.categoryId"
                        placeholder="请选择分类"
                        clearable
                        filterable
                        class="w-[320px]"
                    >
                        <el-option
                            v-for="item in categoryOptions"
                            :key="item.id"
                            :label="item.name"
                            :value="item.id"
                        />
                    </el-select>
                </el-form-item>
                <el-form-item label="标签">
                    <el-select
                        v-model="formData.tagIds"
                        multiple
                        collapse-tags
                        collapse-tags-tooltip
                        placeholder="请选择标签"
                        filterable
                        class="w-[420px]"
                    >
                        <el-option
                            v-for="item in tagOptions"
                            :key="item.id"
                            :label="item.name"
                            :value="item.id"
                        />
                    </el-select>
                </el-form-item>

                <el-divider content-position="left">发布与排序</el-divider>
                <el-form-item label="发布状态">
                    <el-radio-group v-model="formData.status">
                        <el-radio-button label="draft">草稿</el-radio-button>
                        <el-radio-button label="published">发布</el-radio-button>
                    </el-radio-group>
                </el-form-item>
                <el-form-item label="发布时间">
                    <el-date-picker
                        v-model="formData.publishTime"
                        type="datetime"
                        value-format="X"
                        placeholder="留空默认按保存时间"
                        class="w-[320px]"
                    />
                </el-form-item>
                <el-form-item label="推荐位">
                    <el-switch
                        v-model="formData.isRecommended"
                        :active-value="1"
                        :inactive-value="0"
                    />
                </el-form-item>
                <el-form-item label="排序值">
                    <el-input-number v-model="formData.sortOrder" :min="0" :max="9999" />
                </el-form-item>

                <el-divider content-position="left">SEO 信息</el-divider>
                <el-form-item label="SEO标题">
                    <el-input v-model="formData.seoTitle" placeholder="留空默认使用名称" />
                </el-form-item>
                <el-form-item label="SEO关键词">
                    <el-input v-model="formData.seoKeywords" placeholder="多个关键词用逗号分隔" />
                </el-form-item>
                <el-form-item label="SEO描述">
                    <el-input
                        v-model="formData.seoDescription"
                        type="textarea"
                        :rows="3"
                        placeholder="留空默认使用摘要"
                    />
                </el-form-item>

                <el-form-item>
                    <div class="mcp-publish-page__actions">
                        <el-button @click="goBack">取消</el-button>
                        <el-button :loading="submitLoading" @click="submitByStatus('draft')"
                            >保存草稿</el-button
                        >
                        <el-button
                            type="primary"
                            :loading="submitLoading"
                            @click="submitByStatus('published')"
                            >保存并发布</el-button
                        >
                    </div>
                </el-form-item>
            </el-form>
        </el-card>
    </div>
</template>

<script lang="ts" setup name="uiedMcpPublish">
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-20
 */
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import feedback from '@/utils/feedback'
import {
    uiedMcpAdd,
    uiedMcpEdit,
    uiedMcpDetail,
    uiedMcpCategoryAll,
    uiedMcpTagAll
} from '@/api/uied'

interface OptionItem {
    id: number
    name: string
}

type McpStatus = 'draft' | 'published'

const route = useRoute()
const router = useRouter()
const formRef = ref<FormInstance>()
const pageLoading = ref(false)
const submitLoading = ref(false)
const categoryOptions = ref<OptionItem[]>([])
const tagOptions = ref<OptionItem[]>([])

const formData = reactive({
    id: 0,
    name: '',
    slug: '',
    summary: '',
    content: '',
    iconUrl: '',
    coverUrl: '',
    officialUrl: '',
    docsUrl: '',
    githubUrl: '',
    transportType: 'http',
    runtime: 'other',
    protocolVersion: '',
    categoryId: undefined as number | undefined,
    tagIds: [] as number[],
    status: 'draft' as McpStatus,
    isRecommended: 0,
    sortOrder: 0,
    publishTime: '',
    seoTitle: '',
    seoKeywords: '',
    seoDescription: ''
})

const rules: FormRules = {
    name: [{ required: true, message: '请输入 MCP 名称', trigger: 'blur' }],
    officialUrl: [
        {
            validator: (_rule, value, callback) => {
                const text = String(value || '').trim()
                if (!text) {
                    callback()
                    return
                }
                if (/^https?:\/\//i.test(text)) {
                    callback()
                    return
                }
                callback(new Error('官网链接需以 http:// 或 https:// 开头'))
            },
            trigger: 'blur'
        }
    ]
}

/**
 * 返回 MCP 列表。
 */
const goBack = () => {
    router.push('/mcp-center/mcp-list')
}

/**
 * 加载分类与标签选项。
 */
const loadOptions = async () => {
    const [categoryRows, tagRows] = await Promise.all([uiedMcpCategoryAll({}), uiedMcpTagAll({})])
    categoryOptions.value = (Array.isArray(categoryRows) ? categoryRows : [])
        .map((item: any) => ({
            id: Number(item.id || 0),
            name: String(item.name || '')
        }))
        .filter((item) => item.id > 0 && item.name)
    tagOptions.value = (Array.isArray(tagRows) ? tagRows : [])
        .map((item: any) => ({
            id: Number(item.id || 0),
            name: String(item.name || '')
        }))
        .filter((item) => item.id > 0 && item.name)
}

/**
 * 按 ID 加载 MCP 详情用于编辑回填。
 */
const loadDetail = async (id: number) => {
    if (!id) return
    const detail = await uiedMcpDetail({ id })
    formData.id = Number(detail?.id || 0)
    formData.name = String(detail?.name || '')
    formData.slug = String(detail?.slug || '')
    formData.summary = String(detail?.summary || '')
    formData.content = String(detail?.content || '')
    formData.iconUrl = String(detail?.iconUrl || '')
    formData.coverUrl = String(detail?.coverUrl || '')
    formData.officialUrl = String(detail?.officialUrl || '')
    formData.docsUrl = String(detail?.docsUrl || '')
    formData.githubUrl = String(detail?.githubUrl || '')
    formData.transportType = String(detail?.transportType || 'http') || 'http'
    formData.runtime = String(detail?.runtime || 'other') || 'other'
    formData.protocolVersion = String(detail?.protocolVersion || '')
    formData.categoryId = Number(detail?.categoryId || 0) || undefined
    formData.tagIds = (Array.isArray(detail?.tagIds) ? detail.tagIds : [])
        .map((item: any) => Number(item || 0))
        .filter((item: number) => item > 0)
    formData.status = String(detail?.status || 'draft') === 'published' ? 'published' : 'draft'
    formData.isRecommended = Number(detail?.isRecommended || 0) === 1 ? 1 : 0
    formData.sortOrder = Number(detail?.sortOrder || 0)
    formData.publishTime = detail?.publishTime ? String(detail.publishTime) : ''
    formData.seoTitle = String(detail?.seoTitle || '')
    formData.seoKeywords = String(detail?.seoKeywords || '')
    formData.seoDescription = String(detail?.seoDescription || '')
}

/**
 * 构建提交载荷。
 */
const buildPayload = (status: McpStatus) => {
    const publishTime = Number(formData.publishTime || 0)
    return {
        id: formData.id || undefined,
        name: formData.name,
        slug: formData.slug,
        summary: formData.summary,
        content: formData.content,
        icon_url: formData.iconUrl,
        cover_url: formData.coverUrl,
        official_url: formData.officialUrl,
        docs_url: formData.docsUrl,
        github_url: formData.githubUrl,
        transport_type: formData.transportType,
        runtime: formData.runtime,
        protocol_version: formData.protocolVersion,
        category_id: formData.categoryId || null,
        tag_ids: formData.tagIds,
        status,
        is_recommended: Number(formData.isRecommended || 0) === 1 ? 1 : 0,
        sort_order: Number(formData.sortOrder || 0),
        publish_time: publishTime > 0 ? publishTime : undefined,
        seo_title: formData.seoTitle,
        seo_keywords: formData.seoKeywords,
        seo_description: formData.seoDescription
    }
}

/**
 * 按指定状态保存。
 */
const submitByStatus = async (status: McpStatus) => {
    await formRef.value?.validate()
    submitLoading.value = true
    try {
        const payload = buildPayload(status)
        if (formData.id > 0) {
            await uiedMcpEdit(payload)
            feedback.msgSuccess(status === 'published' ? '更新并发布成功' : '草稿更新成功')
        } else {
            await uiedMcpAdd(payload)
            feedback.msgSuccess(status === 'published' ? '发布成功' : '草稿保存成功')
        }
        goBack()
    } finally {
        submitLoading.value = false
    }
}

onMounted(async () => {
    pageLoading.value = true
    try {
        await loadOptions()
        const id = Number(route.query.id || 0)
        if (id > 0) {
            await loadDetail(id)
        }
    } finally {
        pageLoading.value = false
    }
})
</script>

<style scoped>
.mcp-publish-page__title {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #111827;
}

.mcp-publish-page__desc {
    margin: 6px 0 0;
    font-size: 13px;
    color: #6b7280;
}

.mcp-publish-page__form {
    max-width: 860px;
}

.mcp-publish-page__input-row {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 12px;
}

.mcp-publish-page__actions {
    display: flex;
    align-items: center;
    gap: 10px;
}
</style>
