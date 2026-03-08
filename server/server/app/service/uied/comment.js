/**
 * @file service/uied/comment.js
 * @description UIED 评论管理服务
 * @author Tomda
 * @copyright 版权所有 (c) 2026 UIED技术团队
 * @website https://fsuied.com
 * @license MIT
 * @version 1.0.0
 */

'use strict';

const Service = require('egg').Service;

class CommentService extends Service {
  /**
   * 获取评论审核配置（已归一化）
   */
  async getCommentConfig() {
    const { ctx } = this;
    const rawConfig = await ctx.service.uied.setting.getSettingByKey('commentConfig');
    if (typeof ctx.service.uied.setting.normalizeCommentConfig === 'function') {
      return ctx.service.uied.setting.normalizeCommentConfig(rawConfig || {});
    }
    return {
      loginRequired: false,
      autoAuditMode: 'off',
      enableTextDetection: true,
      autoRejectSensitive: true,
      sensitiveWords: '',
      autoPendingSuspicious: true,
      suspiciousWords: '',
      minLength: 2,
      maxLinkCount: 2,
      duplicateCheckEnabled: true,
      duplicateWindowSec: 300,
      duplicateThreshold: 2,
    };
  }

  /**
   * 规范化评论文本，便于重复检测与关键词匹配。
   */
  normalizeCommentText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  /**
   * 将词库文本解析为词条数组（支持换行/逗号/分号分隔）。
   */
  parseWordList(value) {
    return String(value || '')
      .split(/[\n,，;；|]+/)
      .map(item => String(item || '').trim().toLowerCase())
      .filter(Boolean);
  }

  /**
   * 命中词条检测，返回首个命中词。
   */
  findMatchedKeyword(content, words = []) {
    const text = String(content || '').toLowerCase();
    return words.find(word => text.includes(String(word || '').toLowerCase())) || '';
  }

  /**
   * 统计评论中的链接数量（http/https/www）。
   */
  countContentLinks(content) {
    const text = String(content || '');
    const matches = text.match(/(https?:\/\/|www\.)/gi);
    return Array.isArray(matches) ? matches.length : 0;
  }

  /**
   * 获取评论来源 IP
   */
  getClientIp() {
    const { ctx } = this;
    const xff = String(ctx.request.header['x-forwarded-for'] || '').trim();
    if (xff) {
      const firstIp = xff.split(',').map(item => item.trim()).find(Boolean);
      if (firstIp) return firstIp;
    }
    const realIp = String(ctx.request.header['x-real-ip'] || '').trim();
    if (realIp) return realIp;
    return String(ctx.ip || ctx.request.ip || '').trim();
  }

  /**
   * 解析布尔类型参数，兼容 1/0、true/false、yes/no。
   */
  parseBooleanParam(value, defaultValue = false) {
    if (value === null || value === undefined || value === '') return Boolean(defaultValue);
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    const normalized = String(value).trim().toLowerCase();
    if ([ '1', 'true', 'yes', 'on' ].includes(normalized)) return true;
    if ([ '0', 'false', 'no', 'off' ].includes(normalized)) return false;
    return Boolean(defaultValue);
  }

  /**
   * 审核命中原因映射：将内部原因码转换为前端可展示标签与风险权重。
   */
  normalizeAuditReasonMeta(rawReason) {
    const reason = String(rawReason || '').trim();
    if (!reason) {
      return { code: 'unknown', label: '未知规则', weight: 10 };
    }
    if (reason === 'manual_mode') {
      return { code: 'manual_mode', label: '全量待审', weight: 10 };
    }
    if (reason === 'min_length') {
      return { code: 'min_length', label: '内容过短', weight: 20 };
    }
    if (reason === 'too_many_links') {
      return { code: 'too_many_links', label: '外链过多', weight: 35 };
    }
    if (reason === 'duplicate') {
      return { code: 'duplicate', label: '疑似重复', weight: 40 };
    }
    if (reason.startsWith('sensitive:')) {
      const keyword = reason.slice('sensitive:'.length).trim();
      return {
        code: 'sensitive',
        label: keyword ? `敏感词：${keyword}` : '命中敏感词',
        weight: 70,
      };
    }
    if (reason.startsWith('suspicious:')) {
      const keyword = reason.slice('suspicious:'.length).trim();
      return {
        code: 'suspicious',
        label: keyword ? `疑似词：${keyword}` : '命中疑似词',
        weight: 30,
      };
    }
    return { code: 'unknown', label: reason, weight: 15 };
  }

  /**
   * 由命中原因构建审核洞察（风险分、风险等级、标签列表）。
   */
  buildAuditInsightFromReasons(hitReasons = [], status = 'pending') {
    const normalizedStatus = String(status || '').trim().toLowerCase();
    const reasonMetaList = (Array.isArray(hitReasons) ? hitReasons : [])
      .map(item => this.normalizeAuditReasonMeta(item))
      .filter(Boolean);

    const uniqueByCode = new Map();
    reasonMetaList.forEach(item => {
      const key = String(item.code || 'unknown');
      const prev = uniqueByCode.get(key);
      if (!prev || Number(item.weight || 0) > Number(prev.weight || 0)) {
        uniqueByCode.set(key, item);
      }
    });
    const dedupedMeta = Array.from(uniqueByCode.values());

    let riskScore = dedupedMeta.reduce((sum, item) => sum + Number(item.weight || 0), 0);
    if (normalizedStatus === 'rejected') {
      riskScore += 15;
    } else if (normalizedStatus === 'pending' && dedupedMeta.length === 0) {
      riskScore += 20;
    }
    riskScore = Math.max(0, Math.min(100, Math.round(riskScore)));

    const riskLevel = riskScore >= 70 ? 'high' : riskScore >= 35 ? 'medium' : 'low';
    return {
      riskScore,
      riskLevel,
      auditReasonCodes: dedupedMeta.map(item => item.code),
      auditReasonTags: dedupedMeta.map(item => item.label).slice(0, 5),
    };
  }

  /**
   * 针对已存量评论重算审核命中原因（用于后台列表展示“命中原因”标签）。
   */
  async detectAuditReasonsForStoredComment({
    tableName,
    targetIdField,
    targetId,
    content,
    userId = 0,
    ip = '',
    status = 'pending',
    config,
  }) {
    const normalizedContent = this.normalizeCommentText(content);
    const hitReasons = [];
    const normalizedStatus = String(status || '').trim().toLowerCase();

    if (String(config?.autoAuditMode || '').trim() === 'manual' && normalizedStatus === 'pending') {
      hitReasons.push('manual_mode');
    }

    if (config?.enableTextDetection) {
      const minLength = Number(config?.minLength || 0);
      if (minLength > 0 && normalizedContent.length < minLength) {
        hitReasons.push('min_length');
      }

      const maxLinkCount = Number(config?.maxLinkCount || 0);
      const linkCount = this.countContentLinks(normalizedContent);
      if (maxLinkCount >= 0 && linkCount > maxLinkCount) {
        hitReasons.push('too_many_links');
      }

      const sensitiveWords = this.parseWordList(config?.sensitiveWords);
      const suspiciousWords = this.parseWordList(config?.suspiciousWords);
      const matchedSensitive = this.findMatchedKeyword(normalizedContent, sensitiveWords);
      const matchedSuspicious = this.findMatchedKeyword(normalizedContent, suspiciousWords);
      if (matchedSensitive) {
        hitReasons.push(`sensitive:${matchedSensitive}`);
      }
      if (matchedSuspicious && config?.autoPendingSuspicious) {
        hitReasons.push(`suspicious:${matchedSuspicious}`);
      }
    }

    if (config?.duplicateCheckEnabled && normalizedContent) {
      const duplicateCount = await this.countRecentDuplicateComments({
        tableName,
        targetIdField,
        targetId,
        content: normalizedContent,
        userId: Number(userId || 0),
        ip: String(ip || '').trim(),
        windowSec: Number(config?.duplicateWindowSec || 300),
      });
      if (duplicateCount >= Number(config?.duplicateThreshold || 2)) {
        hitReasons.push('duplicate');
      }
    }

    return Array.from(new Set(hitReasons));
  }

  /**
   * 获取同源重复评论数量（窗口时间内）
   */
  async countRecentDuplicateComments({ tableName, targetIdField, targetId, content, userId = 0, ip = '', windowSec = 300 }) {
    const { app } = this;
    const since = Math.floor(Date.now() / 1000) - Math.max(10, Number(windowSec || 300));
    if (Number(userId || 0) > 0) {
      const [ row ] = await app.model.query(
        `SELECT COUNT(*) AS total
         FROM ${tableName}
         WHERE is_delete = 0
           AND ${targetIdField} = ?
           AND user_id = ?
           AND content = ?
           AND create_time >= ?`,
        {
          replacements: [ targetId, Number(userId || 0), content, since ],
          type: app.Sequelize.QueryTypes.SELECT,
        }
      );
      return Number(row?.total || 0);
    }
    if (!ip) return 0;
    const [ row ] = await app.model.query(
      `SELECT COUNT(*) AS total
       FROM ${tableName}
       WHERE is_delete = 0
         AND ${targetIdField} = ?
         AND user_id = 0
         AND ip = ?
         AND content = ?
         AND create_time >= ?`,
      {
        replacements: [ targetId, ip, content, since ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );
    return Number(row?.total || 0);
  }

  /**
   * 评论自动审核判定（off/manual/smart）
   */
  async evaluateCommentAudit({
    tableName,
    targetIdField,
    targetId,
    content,
    userId = 0,
    ip = '',
  }) {
    const config = await this.getCommentConfig();
    const normalizedContent = this.normalizeCommentText(content);
    const hitReasons = [];
    if (config.autoAuditMode === 'off') {
      return {
        status: 'approved',
        hitReasons,
        config,
        ...this.buildAuditInsightFromReasons(hitReasons, 'approved'),
      };
    }
    if (config.autoAuditMode === 'manual') {
      hitReasons.push('manual_mode');
      return {
        status: 'pending',
        hitReasons,
        config,
        ...this.buildAuditInsightFromReasons(hitReasons, 'pending'),
      };
    }
    if (config.enableTextDetection) {
      const minLength = Number(config.minLength || 0);
      if (minLength > 0 && normalizedContent.length < minLength) {
        hitReasons.push('min_length');
      }
      const maxLinkCount = Number(config.maxLinkCount || 0);
      const linkCount = this.countContentLinks(normalizedContent);
      if (maxLinkCount >= 0 && linkCount > maxLinkCount) {
        hitReasons.push('too_many_links');
      }
      const sensitiveWords = this.parseWordList(config.sensitiveWords);
      const suspiciousWords = this.parseWordList(config.suspiciousWords);
      const matchedSensitive = this.findMatchedKeyword(normalizedContent, sensitiveWords);
      const matchedSuspicious = this.findMatchedKeyword(normalizedContent, suspiciousWords);
      if (matchedSensitive) {
        hitReasons.push(`sensitive:${matchedSensitive}`);
        if (config.autoRejectSensitive) {
          return {
            status: 'rejected',
            hitReasons,
            config,
            ...this.buildAuditInsightFromReasons(hitReasons, 'rejected'),
          };
        }
      }
      if (matchedSuspicious && config.autoPendingSuspicious) {
        hitReasons.push(`suspicious:${matchedSuspicious}`);
      }
    }
    if (config.duplicateCheckEnabled) {
      const duplicateCount = await this.countRecentDuplicateComments({
        tableName,
        targetIdField,
        targetId,
        content: normalizedContent,
        userId,
        ip,
        windowSec: Number(config.duplicateWindowSec || 300),
      });
      if ((duplicateCount + 1) >= Number(config.duplicateThreshold || 2)) {
        hitReasons.push('duplicate');
      }
    }
    if (hitReasons.length > 0) {
      return {
        status: 'pending',
        hitReasons,
        config,
        ...this.buildAuditInsightFromReasons(hitReasons, 'pending'),
      };
    }
    return {
      status: 'approved',
      hitReasons,
      config,
      ...this.buildAuditInsightFromReasons(hitReasons, 'approved'),
    };
  }

  /**
   * 格式化评论时间文本（YYYY-MM-DD HH:mm:ss）
   */
  formatCommentTimeString(timestamp) {
    const seconds = Number(timestamp || 0);
    if (!Number.isFinite(seconds) || seconds <= 0) return '';
    const date = new Date(seconds * 1000);
    const pad = value => String(value).padStart(2, '0');
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hour = pad(date.getHours());
    const minute = pad(date.getMinutes());
    const second = pad(date.getSeconds());
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
  }

  /**
   * 检查评论表字段是否存在（用于兼容不同客户库结构）
   */
  async hasCommentColumn(tableName, columnName) {
    const { app } = this;
    const cacheKey = `${String(tableName || '')}.${String(columnName || '')}`.toLowerCase();
    if (!app.__uiedCommentColumnCache) {
      app.__uiedCommentColumnCache = new Map();
    }
    if (app.__uiedCommentColumnCache.has(cacheKey)) {
      return app.__uiedCommentColumnCache.get(cacheKey) === true;
    }
    const [ row ] = await app.model.query(
      `
      SELECT COUNT(1) AS cnt
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?
      `,
      {
        replacements: [ String(tableName || ''), String(columnName || '') ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );
    const exists = Number(row?.cnt || 0) > 0;
    app.__uiedCommentColumnCache.set(cacheKey, exists);
    return exists;
  }

  /**
   * 构建评论排序 SQL，热度优先时自动回退到时间排序
   */
  async buildCommentOrderClause(tableName, sort = 'latest') {
    const normalizedSort = String(sort || '').trim().toLowerCase();
    if (normalizedSort !== 'hot') {
      return 'c.create_time DESC, c.id DESC';
    }
    const hasLikeCountColumn = await this.hasCommentColumn(tableName, 'like_count');
    if (hasLikeCountColumn) {
      return 'c.like_count DESC, c.create_time DESC, c.id DESC';
    }
    return 'c.create_time DESC, c.id DESC';
  }

  /**
   * 获取评论列表（管理后台 & 前端）
   */
  async list(params = {}) {
    const { app } = this;
    const { page = 1, pageSize = 15, type = 'website', status, keyword, articleId, websiteId, sort = 'latest' } = params;
    const offset = (page - 1) * pageSize;

    const tableName = type === 'article' ? 'uied_article_comment' : 'uied_website_comment';
    const targetTable = type === 'article' ? 'uied_article' : 'uied_website';
    const targetIdField = type === 'article' ? 'article_id' : 'website_id';
    // 网站表用 name，文章表用 title
    const titleField = type === 'article' ? 'title' : 'name';

    const replacements = [];
    let conditions = 'c.is_delete = 0';

    if (status) {
      conditions += ' AND c.status = ?';
      replacements.push(status);
    }

    if (keyword) {
      conditions += ' AND (c.content LIKE ? OR c.nickname LIKE ? OR c.email LIKE ?)';
      replacements.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
    }

    // 特定文章/网站的评论
    if (type === 'article' && articleId) {
      conditions += ' AND c.article_id = ?';
      replacements.push(articleId);
    }
    if (type === 'website' && websiteId) {
      conditions += ' AND c.website_id = ?';
      replacements.push(websiteId);
    }

    // 查询总数
    const [ countResult ] = await app.model.query(
      `SELECT COUNT(*) as total FROM ${tableName} c WHERE ${conditions}`,
      { replacements, type: app.Sequelize.QueryTypes.SELECT }
    );

    const orderClause = await this.buildCommentOrderClause(tableName, sort);
    const includeAuditInsight = this.parseBooleanParam(params.withAuditInsight, false);

    // 查询列表（关联目标表获取标题）
    const lists = await app.model.query(
      `SELECT c.*, t.${titleField} as target_title
       FROM ${tableName} c
       LEFT JOIN ${targetTable} t ON c.${targetIdField} = t.id
       WHERE ${conditions}
       ORDER BY ${orderClause}
       LIMIT ? OFFSET ?`,
      {
        replacements: [ ...replacements, parseInt(pageSize), offset ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );

    let formattedLists = lists.map(item => this.formatComment(item, type));
    if (includeAuditInsight) {
      const commentConfig = await this.getCommentConfig();
      formattedLists = await Promise.all(
        formattedLists.map(async item => {
          const hitReasons = await this.detectAuditReasonsForStoredComment({
            tableName,
            targetIdField,
            targetId: Number(item.targetId || 0),
            content: item.content,
            userId: Number(item.userId || 0),
            ip: item.ip || '',
            status: item.status,
            config: commentConfig,
          });
          return {
            ...item,
            ...this.buildAuditInsightFromReasons(hitReasons, item.status),
          };
        })
      );
    }

    return {
      lists: formattedLists,
      count: Number(countResult.total || 0),
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    };
  }

  /**
   * 添加评论
   */
  async add(data) {
    const { app } = this;
    const now = Math.floor(Date.now() / 1000);
    const { articleId, websiteId, parentId = 0, content, userId, userName, email } = data;

    // 判断类型
    const type = articleId ? 'article' : (websiteId ? 'website' : null);
    if (!type) {
      throw new Error('未指定评论对象');
    }

    const tableName = type === 'article' ? 'uied_article_comment' : 'uied_website_comment';
    const targetIdField = type === 'article' ? 'article_id' : 'website_id';
    const targetId = articleId || websiteId;
    const normalizedContent = this.normalizeCommentText(content);
    const clientIp = this.getClientIp();
    const userAgent = String(this.ctx.get('user-agent') || '').slice(0, 500);
    const auditDecision = await this.evaluateCommentAudit({
      tableName,
      targetIdField,
      targetId,
      content: normalizedContent,
      userId: Number(userId || 0),
      ip: clientIp,
    });

    // 插入评论
    const insertResult = await app.model.query(
      `INSERT INTO ${tableName} 
       (${targetIdField}, parent_id, content, user_id, nickname, email, status, ip, user_agent, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      {
        replacements: [
          targetId,
          parentId,
          normalizedContent,
          userId || 0,
          userName || '匿名用户',
          email || '',
          auditDecision.status,
          clientIp,
          userAgent,
          now,
          now,
        ],
        type: app.Sequelize.QueryTypes.INSERT,
      }
    );

    const insertPayload = Array.isArray(insertResult) ? insertResult[0] : insertResult;
    const insertId = Number(
      typeof insertPayload === 'object' && insertPayload !== null
        ? (insertPayload.insertId || insertPayload.id || 0)
        : insertPayload
    ) || 0;
    const [ detail ] = await app.model.query(
      `SELECT * FROM ${tableName} WHERE id = ? LIMIT 1`,
      {
        replacements: [ insertId ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );
    if (!detail) {
      const auditInsight = this.buildAuditInsightFromReasons(auditDecision.hitReasons, auditDecision.status);
      return {
        id: insertId,
        content: normalizedContent,
        parentId: Number(parentId || 0),
        createTime: this.formatCommentTimeString(now),
        status: auditDecision.status,
        auditReasons: auditDecision.hitReasons,
        ...auditInsight,
      };
    }
    const auditInsight = this.buildAuditInsightFromReasons(auditDecision.hitReasons, auditDecision.status);
    return {
      ...this.formatComment(detail, type),
      auditReasons: auditDecision.hitReasons,
      ...auditInsight,
    };
  }

  /**
   * 获取评论详情
   */
  async detail(id, type = 'website') {
    const { app } = this;
    const tableName = type === 'article' ? 'uied_article_comment' : 'uied_website_comment';

    const [ comment ] = await app.model.query(
      `SELECT * FROM ${tableName} WHERE id = ? AND is_delete = 0`,
      { replacements: [ id ], type: app.Sequelize.QueryTypes.SELECT }
    );

    if (!comment) return null;
    return this.formatComment(comment, type);
  }

  /**
   * 批准评论
   */
  async approve(id, type = 'website') {
    const { app } = this;
    const tableName = type === 'article' ? 'uied_article_comment' : 'uied_website_comment';
    const now = Math.floor(Date.now() / 1000);

    await app.model.query(
      `UPDATE ${tableName} SET status = 'approved', update_time = ? WHERE id = ?`,
      { replacements: [ now, id ], type: app.Sequelize.QueryTypes.UPDATE }
    );

    return true;
  }

  /**
   * 拒绝评论
   */
  async reject(id, type = 'website') {
    const { app } = this;
    const tableName = type === 'article' ? 'uied_article_comment' : 'uied_website_comment';
    const now = Math.floor(Date.now() / 1000);

    await app.model.query(
      `UPDATE ${tableName} SET status = 'rejected', update_time = ? WHERE id = ?`,
      { replacements: [ now, id ], type: app.Sequelize.QueryTypes.UPDATE }
    );

    return true;
  }

  /**
   * 删除评论（软删除）
   */
  async del(ids, type = 'website') {
    const { app } = this;
    const tableName = type === 'article' ? 'uied_article_comment' : 'uied_website_comment';
    const now = Math.floor(Date.now() / 1000);
    const idList = Array.isArray(ids) ? ids : [ ids ];
    const placeholders = idList.map(() => '?').join(',');

    await app.model.query(
      `UPDATE ${tableName} SET is_delete = 1, delete_time = ? WHERE id IN (${placeholders})`,
      { replacements: [ now, ...idList ], type: app.Sequelize.QueryTypes.UPDATE }
    );

    return true;
  }

  /**
   * 获取待审核评论数量
   */
  async pendingCount() {
    const { app } = this;

    const [ websiteCount ] = await app.model.query(
      'SELECT COUNT(*) as count FROM uied_website_comment WHERE status = \'pending\' AND is_delete = 0',
      { type: app.Sequelize.QueryTypes.SELECT }
    );

    const [ articleCount ] = await app.model.query(
      'SELECT COUNT(*) as count FROM uied_article_comment WHERE status = \'pending\' AND is_delete = 0',
      { type: app.Sequelize.QueryTypes.SELECT }
    );

    return {
      website: websiteCount.count,
      article: articleCount.count,
      total: websiteCount.count + articleCount.count,
    };
  }

  /**
   * 获取评论统计
   */
  async stats() {
    const { app } = this;

    // 网站评论统计
    const websiteStats = await app.model.query(
      'SELECT status, COUNT(*) as count FROM uied_website_comment WHERE is_delete = 0 GROUP BY status',
      { type: app.Sequelize.QueryTypes.SELECT }
    );

    // 文章评论统计
    const articleStats = await app.model.query(
      'SELECT status, COUNT(*) as count FROM uied_article_comment WHERE is_delete = 0 GROUP BY status',
      { type: app.Sequelize.QueryTypes.SELECT }
    );

    const formatStats = stats => {
      const result = { pending: 0, approved: 0, rejected: 0, total: 0 };
      stats.forEach(s => {
        result[s.status] = s.count;
        result.total += s.count;
      });
      return result;
    };

    return {
      website: formatStats(websiteStats),
      article: formatStats(articleStats),
    };
  }

  /**
   * 提交评论（前端）
   */
  async submit(data, type = 'website') {
    const { app, ctx } = this;
    const tableName = type === 'article' ? 'uied_article_comment' : 'uied_website_comment';
    const targetIdField = type === 'article' ? 'article_id' : 'website_id';
    const now = Math.floor(Date.now() / 1000);

    // 获取 IP 和 User-Agent
    const ip = ctx.ip || ctx.request.ip || '';
    const userAgent = ctx.get('user-agent') || '';

    const [ result ] = await app.model.query(
      `INSERT INTO ${tableName} 
       (${targetIdField}, user_id, nickname, email, content, status, ip, user_agent, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
      {
        replacements: [
          data.targetId,
          data.userId || null,
          data.nickname || '匿名用户',
          data.email || '',
          data.content,
          ip,
          userAgent,
          now,
          now,
        ],
        type: app.Sequelize.QueryTypes.INSERT,
      }
    );

    return result;
  }

  /**
   * 获取目标的已审核评论（前端）
   */
  async getApproved(targetId, type = 'website', params = {}) {
    const { app } = this;
    const { page = 1, pageSize = 20 } = params;
    const offset = (page - 1) * pageSize;
    const tableName = type === 'article' ? 'uied_article_comment' : 'uied_website_comment';
    const targetIdField = type === 'article' ? 'article_id' : 'website_id';

    // 查询总数
    const [ countResult ] = await app.model.query(
      `SELECT COUNT(*) as total FROM ${tableName} 
       WHERE ${targetIdField} = ? AND status = 'approved' AND is_delete = 0`,
      { replacements: [ targetId ], type: app.Sequelize.QueryTypes.SELECT }
    );

    // 查询列表
    const lists = await app.model.query(
      `SELECT id, nickname, content, create_time FROM ${tableName}
       WHERE ${targetIdField} = ? AND status = 'approved' AND is_delete = 0
       ORDER BY create_time DESC
       LIMIT ? OFFSET ?`,
      {
        replacements: [ targetId, parseInt(pageSize), offset ],
        type: app.Sequelize.QueryTypes.SELECT,
      }
    );

    return {
      lists: lists.map(item => ({
        id: item.id,
        nickname: item.nickname,
        content: item.content,
        createdAt: item.create_time ? item.create_time * 1000 : null,
      })),
      total: countResult.total,
      page: parseInt(page),
      pageSize: parseInt(pageSize),
    };
  }

  /**
   * 格式化评论数据
   */
  formatComment(comment, type) {
    const targetIdField = type === 'article' ? 'article_id' : 'website_id';
    const createTimestamp = Number(comment.create_time || 0);
    const updateTimestamp = Number(comment.update_time || 0);
    const createTime = this.formatCommentTimeString(createTimestamp);
    const updateTime = this.formatCommentTimeString(updateTimestamp);
    return {
      id: comment.id,
      targetId: comment[targetIdField],
      targetTitle: comment.target_title || '',
      userId: comment.user_id,
      articleId: type === 'article' ? Number(comment[targetIdField] || 0) : 0,
      websiteId: type === 'website' ? Number(comment[targetIdField] || 0) : 0,
      parentId: Number(comment.parent_id || 0),
      isTop: Number(comment.is_top || 0),
      nickname: comment.nickname,
      email: comment.email,
      content: comment.content,
      status: comment.status,
      ip: comment.ip,
      userAgent: comment.user_agent,
      avatar: comment.avatar || '',
      likeCount: Number(comment.like_count || 0),
      isLike: Number(comment.is_like || 0),
      createTime,
      updateTime,
      createdAt: createTimestamp ? createTimestamp * 1000 : null,
      updatedAt: updateTimestamp ? updateTimestamp * 1000 : null,
    };
  }

  /**
   * 获取文章评论（前端）
   * @param {number|string} articleId - 文章ID
   * @param {object} params - 分页参数
   */
  async articleComments(articleId, params = {}) {
    return this.getApproved(articleId, 'article', params);
  }

  /**
   * 添加文章评论（前端）
   * @param {object} data - 评论数据
   */
  async addArticleComment(data) {
    const { app, ctx } = this;
    const now = Math.floor(Date.now() / 1000);

    // 获取 IP 和 User-Agent
    const ip = ctx.ip || ctx.request.ip || '';
    const userAgent = ctx.get('user-agent') || '';

    const [ result ] = await app.model.query(
      `INSERT INTO uied_article_comment 
       (article_id, user_id, nickname, email, content, status, ip, user_agent, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
      {
        replacements: [
          data.articleId,
          data.userId || null,
          data.userName || '匿名用户',
          data.email || '',
          data.content,
          ip,
          userAgent,
          now,
          now,
        ],
        type: app.Sequelize.QueryTypes.INSERT,
      }
    );

    return {
      id: result,
      articleId: data.articleId,
      content: data.content,
      nickname: data.userName || '匿名用户',
      status: 'pending',
      createdAt: now * 1000,
    };
  }
}

module.exports = CommentService;
