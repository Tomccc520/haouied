/**
 * @file service/uied/aiUsageLog.js
 * @description AI 使用日志服务
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */

'use strict';

const Service = require('egg').Service;

class AiUsageLogService extends Service {
  /**
   * 将日期字符串转换为秒级时间戳（支持 YYYY-MM-DD 与完整时间）
   * @param {string|number} value 原始日期值
   * @param {'start'|'end'} mode 起止模式
   * @return {number|null} 秒级时间戳
   */
  normalizeDateToUnix(value, mode = 'start') {
    const raw = String(value || '').trim();
    if (!raw) return null;

    // 兼容直接传秒级/毫秒级时间戳
    if (/^\d+$/.test(raw)) {
      const numeric = Number(raw);
      if (!Number.isFinite(numeric) || numeric <= 0) return null;
      return numeric > 1e12 ? Math.floor(numeric / 1000) : Math.floor(numeric);
    }

    const hasExplicitTime = /\d{2}:\d{2}(:\d{2})?/.test(raw);
    const normalized = hasExplicitTime
      ? raw
      : `${raw} ${mode === 'end' ? '23:59:59' : '00:00:00'}`;
    const date = new Date(normalized.replace(/-/g, '/'));
    const timestamp = Math.floor(date.getTime() / 1000);
    if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
    return timestamp;
  }

  /**
   * 构建日志查询筛选条件（兼容驼峰/下划线参数）
   * @param {Object} params 查询参数
   * @return {{sql:string,replacements:any[]}} where 片段与绑定参数
   */
  buildListFilterSql(params = {}) {
    const whereSqlParts = [ 'is_delete = 0' ];
    const replacements = [];

    const featureType = String(params.featureType || '').trim();
    const responseStatus = String(params.responseStatus || '').trim();
    const startAt = this.normalizeDateToUnix(params.startDate, 'start');
    const endAt = this.normalizeDateToUnix(params.endDate, 'end');

    if (featureType) {
      whereSqlParts.push('feature_type = ?');
      replacements.push(featureType);
    }
    if (responseStatus) {
      whereSqlParts.push('response_status = ?');
      replacements.push(responseStatus);
    }
    if (startAt) {
      whereSqlParts.push('create_time >= ?');
      replacements.push(startAt);
    }
    if (endAt) {
      whereSqlParts.push('create_time <= ?');
      replacements.push(endAt);
    }

    return {
      sql: whereSqlParts.join(' AND '),
      replacements,
    };
  }

  /**
   * 获取日志列表（分页+筛选）
   * @param {Object} params - 查询参数
   * @param {number} params.page - 页码
   * @param {number} params.pageSize - 每页条数
   * @param {string} params.featureType - 功能类型筛选
   * @param {string} params.responseStatus - 响应状态筛选
   * @param {string} params.startDate - 开始时间
   * @param {string} params.endDate - 结束时间
   */
  async list({ page = 1, pageSize = 20, featureType, responseStatus, startDate, endDate } = {}) {
    const { app } = this;
    const safePage = Number.isFinite(Number(page)) ? Math.max(1, Number(page)) : 1;
    const safePageSize = Number.isFinite(Number(pageSize))
      ? Math.max(1, Math.min(100, Number(pageSize)))
      : 20;
    const offset = (safePage - 1) * safePageSize;

    const filterMeta = this.buildListFilterSql({
      featureType,
      responseStatus,
      startDate,
      endDate,
    });

    // 查询总数
    const [ countResult ] = await app.model.query(
      `SELECT COUNT(*) as total FROM uied_ai_usage_log WHERE ${filterMeta.sql}`,
      { replacements: filterMeta.replacements, type: app.Sequelize.QueryTypes.SELECT }
    );

    // 查询列表
    const logs = await app.model.query(
      `SELECT * FROM uied_ai_usage_log
       WHERE ${filterMeta.sql}
       ORDER BY create_time DESC
       LIMIT ? OFFSET ?`,
      {
        replacements: [ ...filterMeta.replacements, safePageSize, offset ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );

    return {
      lists: logs.map(log => ({
        id: log.id,
        configId: log.config_id,
        config_id: log.config_id,
        featureType: log.feature_type,
        feature_type: log.feature_type,
        requestContent: log.request_content,
        request_content: log.request_content,
        responseStatus: log.response_status,
        response_status: log.response_status,
        errorMessage: log.error_message,
        error_message: log.error_message,
        tokensUsed: log.tokens_used,
        tokens_used: log.tokens_used,
        durationMs: log.duration_ms,
        duration_ms: log.duration_ms,
        createTime: log.create_time,
        create_time: log.create_time,
      })),
      count: countResult.total,
      page: safePage,
      pageNo: safePage,
      pageSize: safePageSize,
    };
  }

  /**
   * 获取聚合统计数据
   */
  async stats() {
    const { app } = this;

    // 总调用次数和总 Token 消耗
    const [ totalResult ] = await app.model.query(
      `SELECT 
        COUNT(*) as totalCalls,
        COALESCE(SUM(tokens_used), 0) as totalTokens,
        COALESCE(AVG(duration_ms), 0) as avgDurationMs,
        COALESCE(AVG(tokens_used), 0) as avgTokensPerCall
       FROM uied_ai_usage_log
       WHERE is_delete = 0`,
      { type: app.Sequelize.QueryTypes.SELECT }
    );

    // 成功/失败统计
    const [ statusResult ] = await app.model.query(
      `SELECT
        COALESCE(SUM(CASE WHEN response_status = 'success' THEN 1 ELSE 0 END), 0) as successCount,
        COALESCE(SUM(CASE WHEN response_status = 'failed' THEN 1 ELSE 0 END), 0) as failedCount
       FROM uied_ai_usage_log
       WHERE is_delete = 0`,
      { type: app.Sequelize.QueryTypes.SELECT }
    );

    const totalCalls = Number(totalResult.totalCalls) || 0;
    const totalTokens = Number(totalResult.totalTokens) || 0;
    const successCount = Number(statusResult.successCount) || 0;
    const failedCalls = Number(statusResult.failedCount) || 0;
    const successRate = totalCalls > 0
      ? Math.round((successCount / totalCalls) * 1000) / 10
      : 0;

    // 今日统计
    const todayStart = Math.floor(new Date().setHours(0, 0, 0, 0) / 1000);
    const [ todayResult ] = await app.model.query(
      `SELECT 
        COUNT(*) as todayCalls,
        COALESCE(SUM(tokens_used), 0) as todayTokens,
        COALESCE(SUM(CASE WHEN response_status = 'success' THEN 1 ELSE 0 END), 0) as todaySuccessCalls,
        COALESCE(SUM(CASE WHEN response_status = 'failed' THEN 1 ELSE 0 END), 0) as todayFailedCalls,
        COALESCE(AVG(duration_ms), 0) as todayAvgDurationMs
       FROM uied_ai_usage_log
       WHERE is_delete = 0 AND create_time >= ?`,
      { replacements: [ todayStart ], type: app.Sequelize.QueryTypes.SELECT }
    );

    // 按类型统计
    const typeStats = await app.model.query(
      `SELECT 
        feature_type,
        COUNT(*) as calls,
        COALESCE(SUM(tokens_used), 0) as tokens,
        COALESCE(SUM(CASE WHEN response_status = 'success' THEN 1 ELSE 0 END), 0) as successCalls
       FROM uied_ai_usage_log
       WHERE is_delete = 0
       GROUP BY feature_type`,
      { type: app.Sequelize.QueryTypes.SELECT }
    );

    const byType = {};
    const byFeature = [];
    for (const stat of typeStats) {
      const featureCalls = Number(stat.calls) || 0;
      const featureSuccess = Number(stat.successCalls) || 0;
      const featureRow = {
        featureType: String(stat.feature_type || ''),
        feature_type: String(stat.feature_type || ''),
        calls: featureCalls,
        tokens: Number(stat.tokens) || 0,
        successCalls: featureSuccess,
        successRate: featureCalls > 0
          ? Math.round((featureSuccess / featureCalls) * 1000) / 10
          : 0,
      };
      byType[featureRow.featureType] = featureRow;
      byFeature.push(featureRow);
    }

    // 最近 7 天趋势（按天聚合）
    const trendRows = await app.model.query(
      `SELECT
        DATE_FORMAT(FROM_UNIXTIME(create_time), '%Y-%m-%d') AS day,
        COUNT(*) AS calls,
        COALESCE(SUM(tokens_used), 0) AS tokens,
        COALESCE(SUM(CASE WHEN response_status = 'success' THEN 1 ELSE 0 END), 0) AS successCalls
      FROM uied_ai_usage_log
      WHERE is_delete = 0
        AND create_time >= ?
      GROUP BY DATE_FORMAT(FROM_UNIXTIME(create_time), '%Y-%m-%d')
      ORDER BY day ASC`,
      {
        replacements: [ todayStart - 6 * 24 * 3600 ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );

    const todayCalls = Number(todayResult.todayCalls) || 0;
    const todaySuccessCalls = Number(todayResult.todaySuccessCalls) || 0;
    const todaySuccessRate = todayCalls > 0
      ? Math.round((todaySuccessCalls / todayCalls) * 1000) / 10
      : 0;

    return {
      totalCalls,
      totalTokens,
      successRate,
      successCount,
      failedCalls,
      avgDurationMs: Math.round(Number(totalResult.avgDurationMs) || 0),
      avgTokensPerCall: Math.round((Number(totalResult.avgTokensPerCall) || 0) * 10) / 10,
      todayCalls,
      todayTokens: Number(todayResult.todayTokens) || 0,
      todaySuccessCalls,
      todayFailedCalls: Number(todayResult.todayFailedCalls) || 0,
      todaySuccessRate,
      todayAvgDurationMs: Math.round(Number(todayResult.todayAvgDurationMs) || 0),
      byType,
      byFeature,
      trend7d: (Array.isArray(trendRows) ? trendRows : []).map(item => ({
        day: String(item.day || ''),
        calls: Number(item.calls) || 0,
        tokens: Number(item.tokens) || 0,
        successCalls: Number(item.successCalls) || 0,
      })),
    };
  }

  /**
   * 记录 AI 使用日志
   * @param {Object} data - 日志数据
   * @param {number} data.configId - AI 配置 ID
   * @param {string} data.featureType - 功能类型: chat, generate, search, batch_generate
   * @param {string} data.requestContent - 请求内容摘要
   * @param {string} data.responseStatus - 响应状态: success, failed
   * @param {string} data.errorMessage - 错误信息
   * @param {number} data.tokensUsed - Token 消耗量
   * @param {number} data.durationMs - 响应耗时(毫秒)
   */
  async add({ configId = 0, featureType = '', requestContent = '', responseStatus = 'success', errorMessage = '', tokensUsed = 0, durationMs = 0 } = {}) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);

    const [ result ] = await app.model.query(
      `INSERT INTO uied_ai_usage_log 
       (config_id, feature_type, request_content, response_status, error_message, tokens_used, duration_ms, is_delete, create_time, update_time, delete_time, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, 0, FROM_UNIXTIME(?), FROM_UNIXTIME(?))`,
      {
        replacements: [
          configId,
          featureType,
          requestContent || null,
          responseStatus,
          errorMessage || null,
          tokensUsed,
          durationMs,
          now,
          now,
          now,
          now,
        ],
        type: app.Sequelize.QueryTypes.INSERT,
      }
    );

    return { id: result };
  }
}

module.exports = AiUsageLogService;
