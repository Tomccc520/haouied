/**
 * @file service/uied/monitor.js
 * @description 网站监控服务
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */

'use strict';

const Service = require('egg').Service;

class MonitorService extends Service {
  /**
   * 规范化监控状态值（兼容历史 normal）。
   * @param {unknown} value 状态值
   * @return {string} 规范化后的状态
   */
  normalizeMonitorStatus(value) {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'normal') return 'active';
    if ([ 'active', 'failed', 'unchecked', 'draft', 'disabled' ].includes(normalized)) {
      return normalized;
    }
    return 'unchecked';
  }

  /**
   * 根据健康探测结果生成监控落库状态。
   * @param {object} probe 健康探测结果
   * @return {{status: string, statusMessage: string}} 状态与说明
   */
  resolveMonitorResultFromProbe(probe) {
    const summary = probe?.summary || {};
    const httpStatus = Number(probe?.http?.statusCode || 0);
    const responseTimeMs = Number(probe?.http?.responseTimeMs || 0);
    const isOk = summary.ok === true;
    if (isOk) {
      const summaryText = String(summary.text || '').trim();
      const detailText = summaryText || (httpStatus > 0 ? `HTTP ${httpStatus}` : '站点状态正常');
      return {
        status: 'active',
        statusMessage: detailText,
      };
    }
    const errorText = String(summary.text || probe?.http?.errorMessage || '').trim()
      || (httpStatus > 0 ? `HTTP ${httpStatus}` : '无法访问');
    return {
      status: 'failed',
      statusMessage: errorText,
    };
  }

  /**
   * 按当前监控结果更新网站状态（新老字段双写，兼容历史库结构）。
   * @param {number} websiteId 网站ID
   * @param {{status: string, statusMessage: string}} result 监控结果
   * @param {number} checkedAtUnix 检查时间（秒）
   */
  async updateWebsiteMonitorStatus(websiteId, result, checkedAtUnix) {
    const { app } = this;
    const normalizedStatus = this.normalizeMonitorStatus(result?.status);
    const statusMessage = String(result?.statusMessage || '').trim() || null;
    await app.model.query(
      `UPDATE uied_website
       SET status = ?,
           last_checked_at = ?,
           last_check_time = ?,
           status_message = ?,
           check_error = ?,
           failed_count = CASE WHEN ? = 'failed' THEN IFNULL(failed_count, 0) + 1 ELSE 0 END,
           update_time = ?
       WHERE id = ?`,
      {
        replacements: [
          normalizedStatus,
          checkedAtUnix,
          checkedAtUnix,
          statusMessage,
          normalizedStatus === 'failed' ? statusMessage : null,
          normalizedStatus,
          checkedAtUnix,
          websiteId,
        ],
        type: app.Sequelize.QueryTypes.UPDATE,
      }
    );
  }

  /**
   * 获取监控统计
   */
  async getStatistics() {
    const { app } = this;

    // 总网站数
    const [ totalResult ] = await app.model.query(
      'SELECT COUNT(*) as count FROM uied_website WHERE is_delete = 0',
      { type: app.Sequelize.QueryTypes.SELECT }
    );

    // 正常网站数
    const [ normalResult ] = await app.model.query(
      "SELECT COUNT(*) as count FROM uied_website WHERE is_delete = 0 AND (status IN ('active', 'normal') OR status IS NULL OR status = '')",
      { type: app.Sequelize.QueryTypes.SELECT }
    );

    // 失效网站数
    const [ failedResult ] = await app.model.query(
      "SELECT COUNT(*) as count FROM uied_website WHERE is_delete = 0 AND status = 'failed'",
      { type: app.Sequelize.QueryTypes.SELECT }
    );

    // 未检查网站数
    const [ uncheckedResult ] = await app.model.query(
      "SELECT COUNT(*) as count FROM uied_website WHERE is_delete = 0 AND status = 'unchecked'",
      { type: app.Sequelize.QueryTypes.SELECT }
    );

    return {
      total: totalResult.count,
      normal: normalResult.count,
      failed: failedResult.count,
      unchecked: uncheckedResult.count,
    };
  }

  /**
   * 获取失效网站列表
   */
  async getFailedWebsites({ page = 1, pageSize = 20 }) {
    const { app } = this;
    const offset = (page - 1) * pageSize;

    const [ countResult ] = await app.model.query(
      "SELECT COUNT(*) as total FROM uied_website WHERE is_delete = 0 AND status = 'failed'",
      { type: app.Sequelize.QueryTypes.SELECT }
    );

    const websites = await app.model.query(
      `SELECT w.id, w.name, w.url, w.status,
              COALESCE(w.last_checked_at, w.last_check_time, 0) as lastCheckTime,
              COALESCE(w.status_message, w.check_error, '') as checkError,
              c.name as categoryName
       FROM uied_website w
       LEFT JOIN uied_category c ON w.category_id = c.id
       WHERE w.is_delete = 0 AND w.status = 'failed'
       ORDER BY COALESCE(w.last_checked_at, w.last_check_time, 0) DESC
       LIMIT ? OFFSET ?`,
      { replacements: [ pageSize, offset ], type: app.Sequelize.QueryTypes.SELECT }
    );

    return {
      lists: websites,
      count: countResult.total,
      page,
      pageSize,
    };
  }

  /**
   * 获取监控配置
   */
  async getConfig() {
    const { app } = this;

    const [ config ] = await app.model.query(
      'SELECT * FROM uied_monitor_config LIMIT 1',
      { type: app.Sequelize.QueryTypes.SELECT }
    );

    if (!config) {
      // 返回默认配置
      return {
        checkInterval: 86400,
        timeout: 10000,
        maxRetries: 3,
        enabled: true,
      };
    }

    return {
      id: config.id,
      checkInterval: config.check_interval,
      timeout: config.timeout,
      maxRetries: config.max_retries,
      enabled: config.enabled === 1,
    };
  }

  /**
   * 更新监控配置
   */
  async updateConfig(data) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);

    const [ existing ] = await app.model.query(
      'SELECT id FROM uied_monitor_config LIMIT 1',
      { type: app.Sequelize.QueryTypes.SELECT }
    );

    if (existing) {
      await app.model.query(
        `UPDATE uied_monitor_config SET 
         check_interval = ?, timeout = ?, max_retries = ?, enabled = ?, update_time = ?
         WHERE id = ?`,
        {
          replacements: [
            data.checkInterval,
            data.timeout,
            data.maxRetries,
            data.enabled ? 1 : 0,
            now,
            existing.id,
          ],
          type: app.Sequelize.QueryTypes.UPDATE,
        }
      );
    } else {
      await app.model.query(
        `INSERT INTO uied_monitor_config (check_interval, timeout, max_retries, enabled, create_time, update_time)
         VALUES (?, ?, ?, ?, ?, ?)`,
        {
          replacements: [
            data.checkInterval,
            data.timeout,
            data.maxRetries,
            data.enabled ? 1 : 0,
            now,
            now,
          ],
          type: app.Sequelize.QueryTypes.INSERT,
        }
      );
    }

    return data;
  }

  /**
   * 检查单个网站
   */
  async checkWebsite(id) {
    const { ctx, app } = this;
    const now = Math.floor(Date.now() / 1000);

    const [ website ] = await app.model.query(
      'SELECT id, name, url FROM uied_website WHERE id = ? AND is_delete = 0',
      { replacements: [ id ], type: app.Sequelize.QueryTypes.SELECT }
    );

    if (!website) {
      throw new Error('网站不存在');
    }

    /**
     * 使用统一健康探测服务，避免把 401/403/429 等“可访问但受限”站点误判为异常。
     */
    let monitorResult = { status: 'failed', statusMessage: '探测失败' };
    try {
      const probe = await ctx.service.uied.websiteHealthProbe.probeByUrl(website.url, {
        timeoutMs: 10000,
        websiteId: String(website.id),
        websiteName: website.name,
      });
      monitorResult = this.resolveMonitorResultFromProbe(probe);
    } catch (error) {
      monitorResult = {
        status: 'failed',
        statusMessage: String(error?.message || '探测失败'),
      };
    }

    await this.updateWebsiteMonitorStatus(id, monitorResult, now);

    return {
      websiteId: id,
      websiteName: website.name,
      success: monitorResult.status === 'active',
      status: monitorResult.status,
      error: monitorResult.statusMessage || null,
    };
  }

  /**
   * 检查所有网站
   */
  async checkAllWebsites({ batchSize = 10, delayMs = 1000 }) {
    const { app } = this;

    const websites = await app.model.query(
      "SELECT id FROM uied_website WHERE is_delete = 0 AND (status IS NULL OR status = '' OR status NOT IN ('draft', 'disabled'))",
      { type: app.Sequelize.QueryTypes.SELECT }
    );

    let checked = 0;
    let failed = 0;
    /**
     * 执行单个站点监测并累计统计信息。
     */
    const checkSingleWebsite = async w => {
      try {
        const result = await this.checkWebsite(w.id);
        checked++;
        if (!result.success) failed++;
      } catch (e) {
        checked++;
        failed++;
      }
    };

    for (let i = 0; i < websites.length; i += batchSize) {
      const batch = websites.slice(i, i + batchSize);

      await Promise.all(batch.map(checkSingleWebsite));

      // 延迟避免请求过快
      if (i + batchSize < websites.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return {
      total: websites.length,
      checked,
      failed,
      success: checked - failed,
    };
  }

  /**
   * 重置网站状态
   */
  async resetWebsiteStatus(id) {
    const { app } = this;

    await app.model.query(
      `UPDATE uied_website
       SET status = 'unchecked',
           last_checked_at = NULL,
           last_check_time = NULL,
           status_message = NULL,
           check_error = NULL,
           failed_count = 0
       WHERE id = ?`,
      { replacements: [ id ], type: app.Sequelize.QueryTypes.UPDATE }
    );
  }
}

module.exports = MonitorService;
