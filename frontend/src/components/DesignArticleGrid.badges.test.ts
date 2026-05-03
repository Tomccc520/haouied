/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-05-03
 * @description 设计文章卡片运营角标单元测试
 */

import { resolveArticleBadges } from './DesignArticleGrid';

describe('设计文章卡片运营角标', () => {
  test('应把后端运营字段转换为可展示角标', () => {
    const badges = resolveArticleBadges({
      id: '1',
      name: '测试文章',
      link: 'https://example.com',
      isFeatured: true,
      isHot: true,
      isNew: true,
    });

    expect(badges.map(item => item.text)).toEqual(['官方', '热', '新']);
  });
});
