<!--
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-20
 */
-->
<template>
    <div class="mcp-category-page">
        <el-card class="!border-none" shadow="never">
            <el-form :model="queryParams" :inline="true" class="mb-[-16px]">
                <el-form-item label="关键词">
                    <el-input
                        v-model="queryParams.keyword"
                        class="w-[220px]"
                        placeholder="分类名称/标识"
                        clearable
                        @keyup.enter="resetPage"
                    />
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="resetPage">查询</el-button>
                    <el-button @click="resetParams">重置</el-button>
                </el-form-item>
            </el-form>
        </el-card>

        <el-card class="!border-none mt-4" shadow="never">
            <div class="mb-4 flex items-center justify-between">
                <el-button type="primary" @click="handleAdd">
                    <template #icon><icon name="el-icon-Plus" /></template>
                    添加分类
                </el-button>
                <div class="text-xs text-[#6b7280]">共 {{ pager.count }} 个分类</div>
            </div>

            <el-table size="large" v-loading="pager.loading" :data="pager.lists">
                <el-table-column label="ID" prop="id" width="80" />
                <el-table-column label="分类名称" prop="name" min-width="180" />
                <el-table-column label="标识" prop="slug" min-width="160" />
                <el-table-column label="MCP数量" prop="itemCount" width="100" />
                <el-table-column label="排序" prop="sortOrder" width="90" />
                <el-table-column label="操作" width="160" fixed="right">
                    <template #default="{ row }">
                        <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
                        <el-button type="danger" link @click="handleDelete(row.id)">删除</el-button>
                    </template>
                </el-table-column>
            </el-table>

            <div class="flex justify-end mt-4">
                <pagination v-model="pager" @change="getLists" />
            </div>
        </el-card>

        <el-dialog
            v-model="dialogVisible"
            :title="formData.id ? '编辑分类' : '添加分类'"
            width="620px"
            :close-on-click-modal="false"
        >
            <el-form ref="formRef" :model="formData" :rules="rules" label-width="110px">
                <el-form-item label="分类名称" prop="name">
                    <el-input v-model="formData.name" placeholder="请输入分类名称" />
                </el-form-item>
                <el-form-item label="分类标识" prop="slug">
                    <el-input v-model="formData.slug" placeholder="留空自动生成" />
                </el-form-item>
                <el-form-item label="分类描述">
                    <el-input v-model="formData.description" type="textarea" :rows="3" placeholder="用于分类页 SEO 描述" />
                </el-form-item>
                <el-form-item label="SEO标题">
                    <el-input v-model="formData.seoTitle" placeholder="可选" />
                </el-form-item>
                <el-form-item label="SEO关键词">
                    <el-input v-model="formData.seoKeywords" placeholder="可选，逗号分隔" />
                </el-form-item>
                <el-form-item label="SEO描述">
                    <el-input v-model="formData.seoDescription" type="textarea" :rows="2" placeholder="可选" />
                </el-form-item>
                <el-form-item label="排序">
                    <el-input-number v-model="formData.sortOrder" :min="0" :max="9999" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="dialogVisible = false">取消</el-button>
                <el-button type="primary" :loading="submitLoading" @click="handleSubmit">保存</el-button>
            </template>
        </el-dialog>
    </div>
</template>

<script lang="ts" setup name="uiedMcpCategory">
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-20
 */
import { reactive, ref } from 'vue'
import type { FormInstance, FormRules } from 'element-plus'
import feedback from '@/utils/feedback'
import { usePaging } from '@/hooks/usePaging'
import {
    uiedMcpCategoryList,
    uiedMcpCategoryAdd,
    uiedMcpCategoryEdit,
    uiedMcpCategoryDelete,
} from '@/api/uied'

const queryParams = reactive({
    keyword: '',
})

const { pager, getLists, resetPage, resetParams } = usePaging({
    fetchFun: uiedMcpCategoryList,
    params: queryParams,
})

const dialogVisible = ref(false)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()
const formData = reactive({
    id: 0,
    name: '',
    slug: '',
    description: '',
    seoTitle: '',
    seoKeywords: '',
    seoDescription: '',
    sortOrder: 0,
})

const rules: FormRules = {
    name: [ { required: true, message: '请输入分类名称', trigger: 'blur' } ],
}

/**
 * 重置分类编辑表单。
 */
const resetFormData = () => {
    formData.id = 0
    formData.name = ''
    formData.slug = ''
    formData.description = ''
    formData.seoTitle = ''
    formData.seoKeywords = ''
    formData.seoDescription = ''
    formData.sortOrder = 0
}

/**
 * 打开新增分类弹窗。
 */
const handleAdd = () => {
    resetFormData()
    dialogVisible.value = true
}

/**
 * 打开编辑分类弹窗并回填数据。
 */
const handleEdit = (row: any) => {
    resetFormData()
    formData.id = Number(row.id || 0)
    formData.name = String(row.name || '')
    formData.slug = String(row.slug || '')
    formData.description = String(row.description || '')
    formData.seoTitle = String(row.seoTitle || '')
    formData.seoKeywords = String(row.seoKeywords || '')
    formData.seoDescription = String(row.seoDescription || '')
    formData.sortOrder = Number(row.sortOrder || 0)
    dialogVisible.value = true
}

/**
 * 保存分类（新增/编辑）。
 */
const handleSubmit = async () => {
    await formRef.value?.validate()
    submitLoading.value = true
    try {
        const payload = {
            id: formData.id || undefined,
            name: formData.name,
            slug: formData.slug,
            description: formData.description,
            seo_title: formData.seoTitle,
            seo_keywords: formData.seoKeywords,
            seo_description: formData.seoDescription,
            sort_order: formData.sortOrder,
        }
        if (formData.id > 0) {
            await uiedMcpCategoryEdit(payload)
            feedback.msgSuccess('分类更新成功')
        } else {
            await uiedMcpCategoryAdd(payload)
            feedback.msgSuccess('分类添加成功')
        }
        dialogVisible.value = false
        await getLists()
    } finally {
        submitLoading.value = false
    }
}

/**
 * 删除分类。
 */
const handleDelete = async (id: number) => {
    const targetId = Number(id || 0)
    if (!targetId) return
    await feedback.confirm('确定删除该分类吗？已关联条目会自动取消分类。')
    await uiedMcpCategoryDelete({ id: targetId })
    feedback.msgSuccess('删除成功')
    await getLists()
}

getLists()
</script>
