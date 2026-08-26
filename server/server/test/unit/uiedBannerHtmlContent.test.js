/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-08-25
 * @description Banner HTML 广告保存链路单元测试
 */

import { createRequire } from 'module';
import { describe, expect, it } from 'vitest';
import { resolveBannerSubmitHtmlContent } from '../../../admin/src/views/uied/banner/bannerForm.ts';

const require = createRequire(import.meta.url);
const BannerService = require('../../app/service/uied/banner.js');

/**
 * 创建 Banner 服务测试实例。
 * @return {BannerService} Banner 服务实例
 */
function createBannerService() {
  return new BannerService({ app: {} });
}

describe('Banner HTML 广告保存链路', () => {
  it('后台应为 HTML 广告原样提交代码内容', () => {
    const html = '<div class="ad"><iframe src="https://example.com/ad"></iframe></div>';

    expect(resolveBannerSubmitHtmlContent('html', html)).toBe(html);
  });

  it('后台应保留文本四卡 JSON，并清空图片类型的历史 HTML', () => {
    const cardJson = '{"schema":"page_banner_cards_v1","cardItems":[]}';

    expect(resolveBannerSubmitHtmlContent('text', cardJson)).toBe(cardJson);
    expect(resolveBannerSubmitHtmlContent('image', '<script>old()</script>')).toBe('');
  });

  it('后端 payload 应原样接收 htmlContent', () => {
    const service = createBannerService();
    const html = '<a href="https://example.com">商业广告</a><script>window.adReady=true</script>';

    const payload = service.buildBannerPayload({
      title: 'HTML 广告',
      contentType: 'html',
      htmlContent: html,
      position: 'home',
    });

    expect(payload.contentType).toBe('html');
    expect(payload.htmlContent).toBe(html);
  });
});
