import request from '@/utils/request'

export function fileCateAdd(params: Record<string, any>) {
    return request.post({ url: '/common/album/cateAdd', params })
}

export function fileCateEdit(params: Record<string, any>) {
    return request.post({ url: '/common/album/cateRename', params })
}

// 文件分类删除
export function fileCateDelete(params: Record<string, any>) {
    return request.post({ url: '/common/album/cateDel', params })
}

// 文件分类列表
export function fileCateLists(params: Record<string, any>) {
    return request.get({ url: '/common/album/cateList', params })
}

// 文件列表
export function fileList(params: Record<string, any>) {
    return request.get({ url: '/common/album/albumList', params })
}

// 文件删除
export function fileDelete(params: Record<string, any>) {
    return request.post({ url: '/common/album/albumDel', params })
}

// 文件移动
export function fileMove(params: Record<string, any>) {
    return request.post({ url: '/common/album/albumMove', params })
}

// 文件重命名
export function fileRename(params: { id: number; name: string }) {
    return request.post({ url: '/common/album/albumRename', params })
}

/**
 * 保存素材元数据
 */
export function fileMetaUpdate(params: {
    id: number
    alt?: string
    title?: string
    caption?: string
    description?: string
    mimeType?: string
    width?: number
    height?: number
}) {
    return request.post({ url: '/common/album/albumMetaUpdate', params })
}

/**
 * 查询素材引用明细
 */
export function fileUsageDetail(params: { id: number }) {
    return request.get({ url: '/common/album/albumUsageDetail', params })
}

/**
 * 执行素材重压缩（支持单图/批量）
 */
export function fileRecompress(params: { id?: number; ids?: number[] }) {
    return request.post({ url: '/common/album/albumRecompress', params })
}

/**
 * 同步本地 uploads/image 历史文件到素材库
 */
export function fileSyncLocalUploads(params?: {
    cid?: number
    limit?: number
    restoreDeleted?: boolean
    scanRoot?: 'uploads' | 'public'
}) {
    return request.post({ url: '/common/album/syncLocalUploads', params: params || {} })
}

/**
 * 批量转存远程图片到素材库
 */
export function transferRemoteImages(params: { urls: string[]; cid?: number }) {
    return request.post({ url: '/common/upload/image/transfer', params })
}

/**
 * 一键转存正文中的外链图片并替换正文地址
 */
export function transferEditorContentImages(params: { contentHtml: string; cid?: number }) {
    return request.post({ url: '/common/upload/image/transfer-content', params })
}
