/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-05-03
 * @description 首页榜单映射逻辑单元测试
 */

import { mapRankingBoardItemsForHome } from './index';

describe('首页榜单映射', () => {
  test('应优先使用后端 isFeatured 字段而不是固定前三条', () => {
    const result = mapRankingBoardItemsForHome([
      {
        key: 'editor_pick',
        title: '编辑精选',
        description: '',
        items: [
          { id: 1, name: 'A', description: '', url: 'https://a.test', isNew: false, isHot: false, isFeatured: false, tags: [] },
          { id: 2, name: 'B', description: '', url: 'https://b.test', isNew: false, isHot: false, isFeatured: false, tags: [] },
          { id: 3, name: 'C', description: '', url: 'https://c.test', isNew: false, isHot: false, isFeatured: false, tags: [] },
          { id: 4, name: 'D', description: '', url: 'https://d.test', isNew: false, isHot: false, isFeatured: true, tags: [] },
        ],
      },
    ]);

    expect(result.map(item => item.isFeatured)).toEqual([false, false, false, true]);
  });
});
