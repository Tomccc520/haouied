/**
 * @file controller/uied/upgradeCenter.js
 * @description UIED 后台升级中心控制器
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.1.3
 */

'use strict';

const baseController = require('../baseController');

class UpgradeCenterController extends baseController {
  /**
   * 统一校验：升级中心仅允许超级管理员访问
   */
  ensureSuperAdmin() {
    this.ctx.service.uied.upgradeCenter.requireSuperAdmin();
  }

  /**
   * 获取升级中心概览
   */
  async overview() {
    const { ctx } = this;
    try {
      this.ensureSuperAdmin();
      const data = await ctx.service.uied.upgradeCenter.getOverview();
      this.result({ data });
    } catch (error) {
      ctx.logger.error('获取升级中心概览失败:', error);
      this.result({ code: 500, message: error.message || '获取升级中心概览失败' });
    }
  }

  /**
   * 获取升级中心配置
   */
  async configGet() {
    const { ctx } = this;
    try {
      this.ensureSuperAdmin();
      const data = await ctx.service.uied.upgradeCenter.getUpgradeConfig();
      this.result({ data });
    } catch (error) {
      ctx.logger.error('获取升级中心配置失败:', error);
      this.result({ code: 500, message: error.message || '获取升级中心配置失败' });
    }
  }

  /**
   * 保存升级中心配置
   */
  async configSave() {
    const { ctx } = this;
    try {
      this.ensureSuperAdmin();
      const body = ctx.request.body || {};
      const data = await ctx.service.uied.upgradeCenter.saveUpgradeConfig(body);
      this.result({ data, message: '升级中心配置已保存' });
    } catch (error) {
      ctx.logger.error('保存升级中心配置失败:', error);
      this.result({ code: 500, message: error.message || '保存升级中心配置失败' });
    }
  }

  /**
   * 获取服务器升级包列表
   */
  async bundleList() {
    const { ctx } = this;
    try {
      this.ensureSuperAdmin();
      const data = await ctx.service.uied.upgradeCenter.listBundlePackages();
      this.result({ data });
    } catch (error) {
      ctx.logger.error('获取升级包列表失败:', error);
      this.result({ code: 500, message: error.message || '获取升级包列表失败' });
    }
  }

  /**
   * 获取升级任务列表
   */
  async taskList() {
    const { ctx } = this;
    try {
      this.ensureSuperAdmin();
      const params = {
        ...(ctx.query || {}),
        ...(ctx.request.body || {}),
      };
      const data = await ctx.service.uied.upgradeCenter.listTasks(params);
      this.result({ data });
    } catch (error) {
      ctx.logger.error('获取升级任务列表失败:', error);
      this.result({ code: 500, message: error.message || '获取升级任务列表失败' });
    }
  }

  /**
   * 获取升级任务详情
   */
  async taskDetail() {
    const { ctx } = this;
    try {
      this.ensureSuperAdmin();
      const params = {
        ...(ctx.query || {}),
        ...(ctx.request.body || {}),
      };
      const taskNo = String(params.taskNo || '').trim();
      if (!taskNo) {
        this.result({ code: 400, message: '缺少 taskNo' });
        return;
      }
      const data = await ctx.service.uied.upgradeCenter.getTaskDetail(taskNo);
      if (!data) {
        this.result({ code: 404, message: '升级任务不存在' });
        return;
      }
      this.result({ data });
    } catch (error) {
      ctx.logger.error('获取升级任务详情失败:', error);
      this.result({ code: 500, message: error.message || '获取升级任务详情失败' });
    }
  }

  /**
   * 获取升级任务日志（尾部）
   */
  async taskLog() {
    const { ctx } = this;
    try {
      this.ensureSuperAdmin();
      const params = {
        ...(ctx.query || {}),
        ...(ctx.request.body || {}),
      };
      const taskNo = String(params.taskNo || '').trim();
      if (!taskNo) {
        this.result({ code: 400, message: '缺少 taskNo' });
        return;
      }
      const lines = Number(params.lines || 200) || 200;
      const data = await ctx.service.uied.upgradeCenter.readTaskLog(taskNo, lines);
      this.result({ data });
    } catch (error) {
      ctx.logger.error('获取升级任务日志失败:', error);
      this.result({ code: 500, message: error.message || '获取升级任务日志失败' });
    }
  }

  /**
   * 发起升级任务
   */
  async start() {
    const { ctx } = this;
    try {
      this.ensureSuperAdmin();
      const body = ctx.request.body || {};
      const data = await ctx.service.uied.upgradeCenter.startUpgradeTask(body);
      this.result({ data, message: '升级任务已启动，请前往任务审计查看进度' });
    } catch (error) {
      ctx.logger.error('发起升级任务失败:', error);
      this.result({ code: 500, message: error.message || '发起升级任务失败' });
    }
  }
}

module.exports = UpgradeCenterController;
