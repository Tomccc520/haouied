/**
 * @file test/unit/aiSearch.test.js
 * @description 单元测试：AI 搜索关键词解析与结果合并
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026.10.05
 */

import { describe, expect, it } from 'vitest';
import {
  buildAiSearchPrompt,
  extractAiSearchKeywords,
  mergeAiSearchRows,
} from '../../app/util/aiSearch.js';

describe('AI 搜索工具', () => {
  it('构建提示词时包含原始查询和 JSON 约束', () => {
    const prompt = buildAiSearchPrompt('适合团队协作的原型工具');
    expect(prompt).toContain('适合团队协作的原型工具');
    expect(prompt).toContain('{"keywords":["关键词1","关键词2"]}');
  });

  it('能够解析模型 JSON 并去重原始查询', () => {
    const keywords = extractAiSearchKeywords(
      '```json\n{"keywords":["原型工具","原型工具","适合团队协作的原型工具","Figma"]}\n```',
      '适合团队协作的原型工具',
    );
    expect(keywords).toEqual([ '原型工具', 'Figma' ]);
  });

  it('模型输出不是 JSON 时安全返回空数组', () => {
    expect(extractAiSearchKeywords('我建议你搜索原型工具。', '原型')).toEqual([]);
  });

  it('合并结果时优先保留原始查询命中并限制数量', () => {
    const rows = mergeAiSearchRows([
      { queryIndex: 0, rows: [{ id: '1', name: '原始命中' }, { id: '2', name: '重复资源' }] },
      { queryIndex: 1, rows: [{ id: '2', name: '重复资源扩展结果' }, { id: '3', name: '扩展命中' }] },
    ], 2);
    expect(rows.map(row => row.id)).toEqual([ '1', '2' ]);
    expect(rows[1].name).toBe('重复资源');
  });
});
