/**
 * @copyright Tomda (https://www.tomda.top)
 * @copyright UIED技术团队 (https://fsuied.com)
 * @author UIED技术团队
 * @createDate 2026-03-18
 */
/**
 * @file controller/uied/seoCenter.js
 * @description SEO 中心控制器
 */

'use strict';

const baseController = require('../baseController');

class SeoCenterController extends baseController {
  /**
   * 获取 SEO 概览
   */
  async overview() {
    const { ctx } = this;
    try {
      const data = await ctx.service.uied.seoCenter.getOverview();
      this.result({ data });
    } catch (error) {
      ctx.logger.error('[seoCenter] 获取概览失败:', error);
      this.result({ code: 500, message: error.message || '获取 SEO 概览失败' });
    }
  }

  /**
   * 获取 SEO 配置
   */
  async configGet() {
    const { ctx } = this;
    try {
      const data = await ctx.service.uied.seoCenter.getConfig();
      this.result({ data });
    } catch (error) {
      ctx.logger.error('[seoCenter] 获取配置失败:', error);
      this.result({ code: 500, message: error.message || '获取 SEO 配置失败' });
    }
  }

  /**
   * 保存 SEO 配置
   */
  async configSave() {
    const { ctx } = this;
    try {
      const payload = ctx.request.body || {};
      const data = await ctx.service.uied.seoCenter.saveConfig(payload);
      this.result({ data, message: '保存成功' });
    } catch (error) {
      ctx.logger.error('[seoCenter] 保存配置失败:', error);
      if (String(error?.code || '') === 'SEO_REDIRECT_FROM_DUPLICATED') {
        this.result({ code: 400, message: error.message || '来源路径重复，请调整后重试' });
        return;
      }
      this.result({ code: 500, message: error.message || '保存 SEO 配置失败' });
    }
  }

  /**
   * 预览 robots.txt
   */
  async robotsPreview() {
    const { ctx } = this;
    try {
      const text = await ctx.service.uied.seoCenter.buildRobotsTxt({ siteOrigin: ctx.query?.siteOrigin });
      this.result({ data: { text } });
    } catch (error) {
      ctx.logger.error('[seoCenter] 预览 robots 失败:', error);
      this.result({ code: 500, message: error.message || '预览 robots.txt 失败' });
    }
  }

  /**
   * 预览基础 sitemap.xml
   */
  async sitemapBasicPreview() {
    const { ctx } = this;
    try {
      const xml = await ctx.service.uied.seoCenter.buildBasicSitemapXml({ siteOrigin: ctx.query?.siteOrigin });
      this.result({ data: { xml } });
    } catch (error) {
      ctx.logger.error('[seoCenter] 预览基础 sitemap 失败:', error);
      this.result({ code: 500, message: error.message || '预览基础 sitemap 失败' });
    }
  }

  /**
   * 预览进阶 sitemap 索引
   */
  async sitemapAdvancedPreview() {
    const { ctx } = this;
    try {
      const bundle = await ctx.service.uied.seoCenter.buildAdvancedSitemapBundle({ siteOrigin: ctx.query?.siteOrigin });
      this.result({ data: { indexXml: bundle.indexXml, files: bundle.meta } });
    } catch (error) {
      ctx.logger.error('[seoCenter] 预览进阶 sitemap 失败:', error);
      this.result({ code: 500, message: error.message || '预览进阶 sitemap 失败' });
    }
  }

  /**
   * 预览进阶 sitemap 子文件
   */
  async sitemapAdvancedFilePreview() {
    const { ctx } = this;
    try {
      const fileName = String(ctx.query?.fileName || '').trim();
      if (!fileName) {
        return this.result({ code: 400, message: '缺少 fileName 参数' });
      }
      const bundle = await ctx.service.uied.seoCenter.buildAdvancedSitemapBundle({ siteOrigin: ctx.query?.siteOrigin });
      const xml = bundle.files[fileName] || '';
      if (!xml) {
        return this.result({ code: 404, message: '未找到对应 sitemap 文件' });
      }
      this.result({ data: { fileName, xml } });
    } catch (error) {
      ctx.logger.error('[seoCenter] 读取进阶 sitemap 文件失败:', error);
      this.result({ code: 500, message: error.message || '读取进阶 sitemap 文件失败' });
    }
  }

  /**
   * 获取 404 日志
   */
  async logs404() {
    const { ctx } = this;
    try {
      const rows = await ctx.service.uied.seoCenter.getLogs('seo404Logs');
      this.result({ data: rows });
    } catch (error) {
      ctx.logger.error('[seoCenter] 获取 404 日志失败:', error);
      this.result({ code: 500, message: error.message || '获取 404 日志失败' });
    }
  }

  /**
   * 获取失效链接日志
   */
  async logsInvalid() {
    const { ctx } = this;
    try {
      const rows = await ctx.service.uied.seoCenter.getLogs('seoInvalidUrlLogs');
      this.result({ data: rows });
    } catch (error) {
      ctx.logger.error('[seoCenter] 获取失效链接日志失败:', error);
      this.result({ code: 500, message: error.message || '获取失效链接日志失败' });
    }
  }

  /**
   * 获取进阶链接检测日志
   */
  async logsLinkDetector() {
    const { ctx } = this;
    try {
      const rows = await ctx.service.uied.seoCenter.getLogs('seoLinkDetectorLogs');
      this.result({ data: rows });
    } catch (error) {
      ctx.logger.error('[seoCenter] 获取进阶链接检测日志失败:', error);
      this.result({ code: 500, message: error.message || '获取进阶链接检测日志失败' });
    }
  }

  /**
   * 获取图片优化检测日志
   */
  async logsImageOptimization() {
    const { ctx } = this;
    try {
      const rows = await ctx.service.uied.seoCenter.getLogs('seoImageOptimizationLogs');
      this.result({ data: rows });
    } catch (error) {
      ctx.logger.error('[seoCenter] 获取图片优化日志失败:', error);
      this.result({ code: 500, message: error.message || '获取图片优化日志失败' });
    }
  }

  /**
   * 获取站长推送日志
   */
  async logsPush() {
    const { ctx } = this;
    try {
      const rows = await ctx.service.uied.seoCenter.getLogs('seoPushLogs');
      this.result({ data: rows });
    } catch (error) {
      ctx.logger.error('[seoCenter] 获取推送日志失败:', error);
      this.result({ code: 500, message: error.message || '获取推送日志失败' });
    }
  }

  /**
   * 获取自动任务日志
   */
  async logsAutoTask() {
    const { ctx } = this;
    try {
      const rows = await ctx.service.uied.seoCenter.getLogs('seoAutoTaskLogs');
      this.result({ data: rows });
    } catch (error) {
      ctx.logger.error('[seoCenter] 获取自动任务日志失败:', error);
      this.result({ code: 500, message: error.message || '获取自动任务日志失败' });
    }
  }

  /**
   * 清空指定日志
   */
  async logsClear() {
    const { ctx } = this;
    try {
      const keyMap = {
        seo404Logs: 'seo404Logs',
        seoInvalidUrlLogs: 'seoInvalidUrlLogs',
        seoLinkDetectorLogs: 'seoLinkDetectorLogs',
        seoImageOptimizationLogs: 'seoImageOptimizationLogs',
        seoPushLogs: 'seoPushLogs',
        seoAutoTaskLogs: 'seoAutoTaskLogs',
      };
      const logKey = String(ctx.request.body?.logKey || '').trim();
      if (!keyMap[logKey]) {
        return this.result({ code: 400, message: '无效的 logKey' });
      }
      await ctx.service.uied.seoCenter.clearLogs(keyMap[logKey]);
      this.result({ message: '清空成功' });
    } catch (error) {
      ctx.logger.error('[seoCenter] 清空日志失败:', error);
      this.result({ code: 500, message: error.message || '清空日志失败' });
    }
  }

  /**
   * 执行失效 URL 扫描
   */
  async scanInvalid() {
    const { ctx } = this;
    try {
      const payload = ctx.request.body || {};
      const data = await ctx.service.uied.seoCenter.scanInvalidUrls(payload);
      this.result({ data, message: '扫描完成' });
    } catch (error) {
      ctx.logger.error('[seoCenter] 失效 URL 扫描失败:', error);
      this.result({ code: 500, message: error.message || '失效 URL 扫描失败' });
    }
  }

  /**
   * 执行进阶链接检测
   */
  async scanLinkDetector() {
    const { ctx } = this;
    try {
      const payload = ctx.request.body || {};
      const data = await ctx.service.uied.seoCenter.runAdvancedLinkDetector(payload);
      this.result({ data, message: '检测完成' });
    } catch (error) {
      ctx.logger.error('[seoCenter] 进阶链接检测失败:', error);
      this.result({ code: 500, message: error.message || '进阶链接检测失败' });
    }
  }

  /**
   * 执行图片优化检测
   */
  async scanImageOptimization() {
    const { ctx } = this;
    try {
      const payload = ctx.request.body || {};
      const data = await ctx.service.uied.seoCenter.runImageOptimizationScan(payload);
      this.result({ data, message: '检测完成' });
    } catch (error) {
      ctx.logger.error('[seoCenter] 图片优化检测失败:', error);
      this.result({ code: 500, message: error.message || '图片优化检测失败' });
    }
  }

  /**
   * 获取内部链接建议
   */
  async internalLinks() {
    const { ctx } = this;
    try {
      const data = await ctx.service.uied.seoCenter.getInternalLinkSuggestions(ctx.query || {});
      this.result({ data });
    } catch (error) {
      ctx.logger.error('[seoCenter] 获取内部链接建议失败:', error);
      this.result({ code: 500, message: error.message || '获取内部链接建议失败' });
    }
  }

  /**
   * 执行站长平台推送
   */
  async pushPlatform() {
    const { ctx } = this;
    try {
      const payload = ctx.request.body || {};
      const data = await ctx.service.uied.seoCenter.pushToPlatforms(payload);
      this.result({ data, message: '推送成功' });
    } catch (error) {
      ctx.logger.error('[seoCenter] 推送失败:', error);
      this.result({ code: 500, message: error.message || '站长平台推送失败' });
    }
  }

  /**
   * 获取 SEO 自动任务状态
   */
  async autoTaskStatus() {
    const { ctx } = this;
    try {
      const data = await ctx.service.uied.seoCenter.getAutoTaskStatus();
      this.result({ data });
    } catch (error) {
      ctx.logger.error('[seoCenter] 获取自动任务状态失败:', error);
      this.result({ code: 500, message: error.message || '获取自动任务状态失败' });
    }
  }

  /**
   * 手动执行 SEO 自动任务
   */
  async autoTaskRun() {
    const { ctx } = this;
    try {
      const payload = ctx.request.body || {};
      const data = await ctx.service.uied.seoCenter.runAutoTaskNow({
        taskType: payload.taskType,
        trigger: 'manual',
        respectSwitch: payload.respectSwitch !== false,
        siteOrigin: payload.siteOrigin,
      });
      this.result({ data, message: '自动任务执行完成' });
    } catch (error) {
      ctx.logger.error('[seoCenter] 自动任务执行失败:', error);
      this.result({ code: 500, message: error.message || '自动任务执行失败' });
    }
  }
}

module.exports = SeoCenterController;
