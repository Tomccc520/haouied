/**
 * @file util/aiSearch.js
 * @description AI 搜索提示词、模型关键词解析与结果合并工具
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026.10.05
 */

'use strict';

/**
 * 构建模型搜索提示词，只要求模型返回可用于站内检索的短关键词。
 * @param {string} query 用户原始搜索词
 * @param {number} maxKeywords 最大扩展词数量
 * @return {string} 模型提示词
 */
function buildAiSearchPrompt(query, maxKeywords = 6) {
  const safeQuery = String(query || '').trim().slice(0, 120);
  const safeLimit = Math.max(1, Math.min(8, Number(maxKeywords) || 6));
  return [
    '你是 UIED 设计导航的站内搜索改写器。',
    '请根据用户的自然语言需求，提取可在网站名称、描述、分类、标签或文章标题中命中的短关键词。',
    `最多返回 ${safeLimit} 个关键词，每个关键词 2 到 24 个字符。`,
    '只返回 JSON，不要解释，不要编造网站或文章，不要返回完整句子。',
    'JSON 格式必须是：{"keywords":["关键词1","关键词2"]}',
    `用户搜索：${safeQuery}`,
  ].join('\n');
}

/**
 * 从模型响应中提取并清洗关键词，模型输出异常时返回空数组触发关键词兜底。
 * @param {unknown} content 模型返回文本
 * @param {string} query 原始搜索词
 * @param {number} maxKeywords 最大扩展词数量
 * @return {string[]} 清洗后的关键词数组
 */
function extractAiSearchKeywords(content, query, maxKeywords = 6) {
  const text = String(content || '').trim();
  const normalizedQuery = String(query || '').trim().toLowerCase();
  if (!text) return [];

  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  let parsed = null;
  try {
    parsed = JSON.parse(cleaned);
  } catch (error) {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        parsed = null;
      }
    }
  }

  const source = Array.isArray(parsed)
    ? parsed
    : (Array.isArray(parsed?.keywords)
      ? parsed.keywords
      : (Array.isArray(parsed?.queries) ? parsed.queries : []));
  const seen = new Set();
  const limit = Math.max(1, Math.min(8, Number(maxKeywords) || 6));
  return source
    .map(item => String(item || '').replace(/^[\s\d.、-]+/, '').trim())
    .filter(item => item.length >= 2 && item.length <= 24)
    .filter(item => !normalizedQuery || item.toLowerCase() !== normalizedQuery)
    .filter(item => {
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

/**
 * 合并多个关键词查询结果并去重，优先保留原始关键词命中的结果。
 * @param {Array<{rows:Array, queryIndex:number}>} groups 分组查询结果
 * @param {number} limit 最终结果上限
 * @return {Array} 合并后的搜索结果
 */
function mergeAiSearchRows(groups = [], limit = 100) {
  const resultMap = new Map();
  (Array.isArray(groups) ? groups : []).forEach(group => {
    const queryIndex = Number(group?.queryIndex || 0);
    const rows = Array.isArray(group?.rows) ? group.rows : [];
    rows.forEach(row => {
      const key = String(row?.id || row?.url || row?.name || '').trim().toLowerCase();
      if (!key) return;
      const current = resultMap.get(key);
      if (!current || queryIndex < current.queryIndex) {
        resultMap.set(key, { row, queryIndex });
      }
    });
  });

  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 100));
  return Array.from(resultMap.values())
    .sort((left, right) => {
      if (left.queryIndex !== right.queryIndex) return left.queryIndex - right.queryIndex;
      return Number(right.row?.relevanceScore || 0) - Number(left.row?.relevanceScore || 0);
    })
    .slice(0, safeLimit)
    .map(item => item.row);
}

module.exports = {
  buildAiSearchPrompt,
  extractAiSearchKeywords,
  mergeAiSearchRows,
};
