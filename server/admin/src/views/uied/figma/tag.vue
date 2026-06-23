<!--
/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-20
 */
-->
<template>
    <div class="figma-tag-page">
        <el-card class="!border-none" shadow="never">
            <el-form :model="queryParams" :inline="true" class="mb-[-16px]">
                <el-form-item label="关键词">
                    <el-input
                        v-model="queryParams.keyword"
                        class="w-[220px]"
                        placeholder="标签名称/标识"
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
                    添加标签
                </el-button>
                <div class="text-xs text-[#6b7280]">共 {{ pager.count }} 个标签</div>
            </div>

            <el-table size="large" v-loading="pager.loading" :data="pager.lists">
                <el-table-column label="ID" prop="id" width="80" />
                <el-table-column label="标签名称" prop="name" min-width="180" />
                <el-table-column label="标识" prop="slug" min-width="160" />
                <el-table-column label="Figma插件数量" prop="itemCount" width="100" />
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
            :title="formData.id ? '编辑标签' : '添加标签'"
            width="620px"
            :close-on-click-modal="false"
        >
            <el-form ref="formRef" :model="formData" :rules="rules" label-width="110px">
                <el-form-item label="标签名称" prop="name">
                    <el-input v-model="formData.name" placeholder="请输入标签名称" />
                </el-form-item>
                <el-form-item label="标签标识" prop="slug">
                    <el-input v-model="formData.slug" placeholder="留空自动生成" />
                </el-form-item>
                <el-form-item label="标签描述">
                    <el-input
                        v-model="formData.description"
                        type="textarea"
                        :rows="3"
                        placeholder="用于标签页说明"
                    />
                </el-form-item>
                <el-form-item label="排序">
                    <el-input-number v-model="formData.sortOrder" :min="0" :max="9999" />
                </el-form-item>
            </el-form>
            <template #footer>
                <el-button @click="dialogVisible = false">取消</el-button>
                <el-button type="primary" :loading="submitLoading" @click="handleSubmit"
                    >保存</el-button
                >
            </template>
        </el-dialog>
    </div>
</template>

<script lang="ts" setup name="uiedFigmaTag">
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
import { uiedFigmaTagList, uiedFigmaTagAdd, uiedFigmaTagEdit, uiedFigmaTagDelete } from '@/api/uied'

const queryParams = reactive({
    keyword: ''
})

const { pager, getLists, resetPage, resetParams } = usePaging({
    fetchFun: uiedFigmaTagList,
    params: queryParams
})

const dialogVisible = ref(false)
const submitLoading = ref(false)
const formRef = ref<FormInstance>()
const formData = reactive({
    id: 0,
    name: '',
    slug: '',
    description: '',
    sortOrder: 0
})

const rules: FormRules = {
    name: [{ required: true, message: '请输入标签名称', trigger: 'blur' }]
}

/**
 * 重置标签表单。
 */
const resetFormData = () => {
    formData.id = 0
    formData.name = ''
    formData.slug = ''
    formData.description = ''
    formData.sortOrder = 0
}

/**
 * 打开新增标签弹窗。
 */
const handleAdd = () => {
    resetFormData()
    dialogVisible.value = true
}

/**
 * 打开编辑标签弹窗并回填。
 */
const handleEdit = (row: any) => {
    resetFormData()
    formData.id = Number(row.id || 0)
    formData.name = String(row.name || '')
    formData.slug = String(row.slug || '')
    formData.description = String(row.description || '')
    formData.sortOrder = Number(row.sortOrder || 0)
    dialogVisible.value = true
}

/**
 * 保存标签（新增/编辑）。
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
            sort_order: formData.sortOrder
        }
        if (formData.id > 0) {
            await uiedFigmaTagEdit(payload)
            feedback.msgSuccess('标签更新成功')
        } else {
            await uiedFigmaTagAdd(payload)
            feedback.msgSuccess('标签添加成功')
        }
        dialogVisible.value = false
        await getLists()
    } finally {
        submitLoading.value = false
    }
}

/**
 * 删除标签。
 */
const handleDelete = async (id: number) => {
    const targetId = Number(id || 0)
    if (!targetId) return
    await feedback.confirm('确定删除该标签吗？已关联条目会自动取消标签。')
    await uiedFigmaTagDelete({ id: targetId })
    feedback.msgSuccess('删除成功')
    await getLists()
}

getLists()
</script>
