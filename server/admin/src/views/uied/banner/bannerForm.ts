/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-08-25
 * @description Banner 表单提交字段规范化
 */

/**
 * 解析 Banner 最终提交的 HTML 内容。
 * HTML 广告保存代码片段，文本类型保存置顶四卡 JSON；图片类型必须清空历史内容。
 * @param contentType 广告内容类型
 * @param htmlContent HTML 代码或四卡 JSON
 * @returns 应提交到后端的 htmlContent
 */
export function resolveBannerSubmitHtmlContent(
    contentType: unknown,
    htmlContent: unknown
): string {
    const normalizedType = String(contentType || '')
        .trim()
        .toLowerCase()
    if (!['html', 'text'].includes(normalizedType)) return ''
    return String(htmlContent ?? '')
}
