/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-04-05
 */

import type { SearchConfig } from '../services/publicSettingService';

type SearchCopySource = Partial<Pick<
  SearchConfig,
  | 'aiResultSummaryTemplate'
  | 'aiKeywordResultSummaryTemplate'
  | 'aiSemanticResultSummaryTemplate'
  | 'aiCacheSuffixText'
>>;

/**
 * 按占位符渲染搜索文案模板，统一支持 {count} / {extra}。
 */
export function renderSearchCopyTemplate(
  template: string,
  values: Record<string, string | number>,
): string {
  return String(template || '')
    .replace(/\{count\}/g, String(values.count ?? ''))
    .replace(/\{extra\}/g, String(values.extra ?? ''))
    .trim();
}

/**
 * 生成 AI 命中结果摘要，兼容原因、缓存标识等附加信息。
 */
export function formatAiResultSummary(
  searchConfig: SearchCopySource,
  count: number,
  extraText: string = '',
): string {
  return renderSearchCopyTemplate(
    String(searchConfig.aiResultSummaryTemplate || 'AI 智能推荐找到 {count} 个结果{extra}'),
    {
      count,
      extra: extraText,
    },
  );
}

/**
 * 生成人工关键词匹配摘要。
 */
export function formatAiKeywordResultSummary(
  searchConfig: SearchCopySource,
  count: number,
): string {
  return renderSearchCopyTemplate(
    String(searchConfig.aiKeywordResultSummaryTemplate || '关键词匹配找到 {count} 个结果'),
    {
      count,
      extra: '',
    },
  );
}

/**
 * 生成 AI 语义扩展摘要，用于 AI 命中为空时的兜底提示。
 */
export function formatAiSemanticResultSummary(
  searchConfig: SearchCopySource,
  count: number,
  extraText: string = '',
): string {
  return renderSearchCopyTemplate(
    String(searchConfig.aiSemanticResultSummaryTemplate || 'AI 语义扩展已返回 {count} 个结果{extra}'),
    {
      count,
      extra: extraText,
    },
  );
}
